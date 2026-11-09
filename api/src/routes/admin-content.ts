/**
 * Admin CMS API — content management.
 *
 * ---------------------------------------------------------------------------
 * What this file is for
 * ---------------------------------------------------------------------------
 * `routes/admin.ts` handles *operations* (bookings, enquiries). This file
 * handles *content*: the tours and destinations the public site shows. Before
 * this existed the admin panel could read the catalogue but not change it,
 * so adding a tour meant a database query by hand.
 *
 * Every route here sits behind `requireAdmin`, which is the API's own JWT
 * check. Note the layering:
 *
 *   browser  --Bearer JWT-->  API  --superuser DB-->  Postgres
 *                          --machine account-->   Supabase Storage
 *
 * The API is the only writer. That is why the *database* does not need to
 * know about admins — the permission check lives in one place (`requireAdmin`)
 * instead of being spread across eight policies.
 *
 * ---------------------------------------------------------------------------
 * Draft vs published
 * ---------------------------------------------------------------------------
 * `published` is a real column, not a UI trick. An unpublished tour is
 * invisible to the public API (see routes/tours.ts) but fully editable here,
 * so you can write a tour on Monday and publish it on Friday.
 */
import { Router, raw } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { getDb } from '../db/client.js';
import { bookings, destinations, tourDays, tourImages, tours } from '../db/schema.js';
import { ApiError, asyncHandler, sendSuccess } from '../lib/http.js';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  deleteImageFile,
  isCmsUpload,
  pathFromUrl,
  uploadImage,
} from '../lib/storage.js';
import { requireAdmin } from '../middleware/auth.js';

export const adminContentRouter = Router();

// Everything below this line needs a valid admin token.
adminContentRouter.use(requireAdmin);

/**
 * A boolean that survives a form post.
 *
 * `z.coerce.boolean()` is a trap: Boolean("false") is `true`, so a hidden
 * field carrying the string "false" would switch the flag ON. This accepts
 * real booleans and the strings a <select> or a checkbox actually produce.
 */
const boolish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off', ''].includes(v)) return false;
  }
  return value;
}, z.boolean());

const slugSchema = z
  .string()
  .trim()
  .min(3, 'A slug needs at least 3 characters')
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers and single dashes only (e.g. gorilla-trek)',
  );

/** Turn "Gorilla Trekking" into "gorilla-trekking". */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

const creditSchema = z.object({
  title: z.string().trim().max(300).optional().default(''),
  artist: z.string().trim().max(200).optional().default(''),
  license: z.string().trim().max(120).optional().default(''),
  sourceUrl: z.string().trim().max(500).optional().default(''),
});

const tourInputSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(3, 'Give the tour a title').max(160),
  destinationId: z.coerce.number().int().positive('Pick a destination'),
  summary: z.string().trim().min(10, 'The summary is shown on cards — at least 10 characters').max(400),
  description: z.string().trim().min(20, 'The description needs at least 20 characters').max(8000),
  priceCents: z.coerce.number().int().min(0).max(10_000_000),
  currency: z.string().trim().length(3, 'Use a 3-letter currency code, e.g. USD').default('USD'),
  durationDays: z.coerce.number().int().min(1).max(365),
  difficulty: z.enum(['easy', 'moderate', 'challenging']).default('moderate'),
  groupSizeMax: z.coerce.number().int().min(1).max(100),
  featured: boolish.optional().default(false),
  published: boolish.optional().default(true),
  coverImage: z.string().trim().max(2000).nullish(),
  imageCredit: creditSchema.nullish(),
  highlights: z.array(z.string().trim().min(1)).max(20).default([]),
  included: z.array(z.string().trim().min(1)).max(20).default([]),
  excluded: z.array(z.string().trim().min(1)).max(20).default([]),
});

const destinationInputSchema = z.object({
  slug: slugSchema.optional(),
  name: z.string().trim().min(2, 'Name the destination').max(120),
  region: z.string().trim().min(2, 'Which region?').max(120),
  tagline: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20).max(8000),
  coverImage: z.string().trim().max(2000).nullish(),
  imageCredit: creditSchema.nullish(),
  highlights: z.array(z.string().trim().min(1)).max(20).default([]),
  bestSeason: z.string().trim().max(120).nullish(),
  averageDays: z.coerce.number().int().min(1).max(365).nullish(),
  published: boolish.optional().default(true),
});

const dayInputSchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(365),
  title: z.string().trim().min(2, 'What happens on this day?').max(200),
  description: z.string().trim().min(5).max(4000),
  accommodation: z.string().trim().max(300).nullish(),
  meals: z.string().trim().max(300).nullish(),
  image: z.string().trim().max(2000).nullish(),
});

const imageInputSchema = z.object({
  url: z.string().trim().min(1, 'Paste an image URL').max(2000),
  alt: z.string().trim().min(1, 'Describe the image for screen readers').max(300),
  position: z.coerce.number().int().min(0).max(999).optional(),
  imageCredit: creditSchema.nullish(),
});

/** Express error for a bad upload, so the client gets a readable message. */
function badUpload(message: string) {
  return ApiError.badRequest(message);
}

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

/** GET /api/admin/destinations — every destination, published or not. */
adminContentRouter.get(
  '/destinations',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(destinations)
      .orderBy(asc(destinations.name));

    const counts = await db
      .select({ destinationId: tours.destinationId, value: sql<number>`count(*)` })
      .from(tours)
      .groupBy(tours.destinationId);

    const countBy = new Map(counts.map((c) => [c.destinationId, Number(c.value)]));
    return sendSuccess(
      res,
      rows.map((row) => ({ ...row, tourCount: countBy.get(row.id) ?? 0 })),
    );
  }),
);

/** POST /api/admin/destinations — create one. */
adminContentRouter.post(
  '/destinations',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const input = destinationInputSchema.parse(req.body);

    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw ApiError.badRequest('Could not work out a URL slug — type the name again.');

    const inserted = await db
      .insert(destinations)
      .values({
        slug,
        name: input.name,
        region: input.region,
        tagline: input.tagline,
        description: input.description,
        coverImage: input.coverImage ?? null,
        imageCredit: input.imageCredit ?? null,
        highlights: input.highlights,
        bestSeason: input.bestSeason ?? null,
        averageDays: input.averageDays ?? null,
        published: input.published,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted[0]) {
      throw ApiError.conflict(`The slug "${slug}" is already taken.`);
    }
    return sendSuccess(res, inserted[0], undefined, 201);
  }),
);

/** PATCH /api/admin/destinations/:id — update one. */
adminContentRouter.patch(
  '/destinations/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('Bad destination id.');

    const input = destinationInputSchema.partial().parse(req.body);

    const [updated] = await db
      .update(destinations)
      .set({
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.region !== undefined ? { region: input.region } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.coverImage !== undefined ? { coverImage: input.coverImage ?? null } : {}),
        ...(input.imageCredit !== undefined ? { imageCredit: input.imageCredit ?? null } : {}),
        ...(input.highlights !== undefined ? { highlights: input.highlights } : {}),
        ...(input.bestSeason !== undefined ? { bestSeason: input.bestSeason ?? null } : {}),
        ...(input.averageDays !== undefined ? { averageDays: input.averageDays ?? null } : {}),
        ...(input.published !== undefined ? { published: input.published } : {}),
        updatedAt: new Date(),
      })
      .where(eq(destinations.id, id))
      .returning();

    if (!updated) throw ApiError.notFound('No destination with that id.');
    return sendSuccess(res, updated);
  }),
);

/**
 * DELETE /api/admin/destinations/:id
 *
 * Refuses while tours still point at it: `destination_id` is ON DELETE
 * CASCADE, so deleting the destination would silently delete its tours too.
 * A guard beats a surprise.
 */
adminContentRouter.delete(
  '/destinations/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('Bad destination id.');

    const [used] = await db
      .select({ value: sql<number>`count(*)` })
      .from(tours)
      .where(eq(tours.destinationId, id));

    if (Number(used?.value ?? 0) > 0) {
      throw ApiError.conflict(
        'This destination still has tours on it. Move or delete those first.',
      );
    }

    const deleted = await db
      .delete(destinations)
      .where(eq(destinations.id, id))
      .returning();

    if (!deleted[0]) throw ApiError.notFound('No destination with that id.');
    return sendSuccess(res, { id });
  }),
);

// ---------------------------------------------------------------------------
// Tours — list, read
// ---------------------------------------------------------------------------

/** GET /api/admin/tours — every tour, published or not. */
adminContentRouter.get(
  '/tours',
  asyncHandler(async (_req, res) => {
    const db = await getDb();

    const rows = await db
      .select({
        id: tours.id,
        slug: tours.slug,
        title: tours.title,
        summary: tours.summary,
        priceCents: tours.priceCents,
        currency: tours.currency,
        durationDays: tours.durationDays,
        difficulty: tours.difficulty,
        featured: tours.featured,
        published: tours.published,
        coverImage: tours.coverImage,
        rating: tours.rating,
        reviewCount: tours.reviewCount,
        updatedAt: tours.updatedAt,
        destinationId: tours.destinationId,
        destinationName: destinations.name,
        destinationSlug: destinations.slug,
        dayCount: sql<number>`(select count(*) from tour_days d where d.tour_id = ${tours.id})`,
        imageCount: sql<number>`(select count(*) from tour_images i where i.tour_id = ${tours.id})`,
        bookingCount: sql<number>`(select count(*) from bookings b where b.tour_id = ${tours.id})`,
      })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .orderBy(desc(tours.updatedAt));

    return sendSuccess(
      res,
      rows.map((row) => ({
        ...row,
        rating: Number(row.rating),
        // Postgres counts come back as bigint -> string. The UI wants numbers.
        dayCount: Number(row.dayCount),
        imageCount: Number(row.imageCount),
        bookingCount: Number(row.bookingCount),
      })),
    );
  }),
);

/** GET /api/admin/tours/:id — one tour with its days and gallery. */
adminContentRouter.get(
  '/tours/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('Bad tour id.');

    const [tour] = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
    if (!tour) throw ApiError.notFound('No tour with that id.');

    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, tour.destinationId))
      .limit(1);

    const days = await db
      .select()
      .from(tourDays)
      .where(eq(tourDays.tourId, id))
      .orderBy(asc(tourDays.dayNumber));

    const images = await db
      .select()
      .from(tourImages)
      .where(eq(tourImages.tourId, id))
      .orderBy(asc(tourImages.position), asc(tourImages.id));

    const [bookingRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.tourId, id));

    return sendSuccess(res, {
      ...tour,
      rating: Number(tour.rating),
      destination: destination ?? null,
      days,
      images,
      bookingCount: Number(bookingRow?.value ?? 0),
    });
  }),
);

// ---------------------------------------------------------------------------
// Tours — create, update, delete
// ---------------------------------------------------------------------------

/** POST /api/admin/tours — create one. */
adminContentRouter.post(
  '/tours',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const input = tourInputSchema.parse(req.body);

    const [destination] = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.id, input.destinationId))
      .limit(1);
    if (!destination) throw ApiError.badRequest('That destination does not exist.');

    const slug = input.slug ?? slugify(input.title);
    if (!slug) throw ApiError.badRequest('Could not work out a URL slug — type the title again.');

    const inserted = await db
      .insert(tours)
      .values({
        slug,
        title: input.title,
        destinationId: input.destinationId,
        summary: input.summary,
        description: input.description,
        priceCents: input.priceCents,
        currency: input.currency,
        durationDays: input.durationDays,
        difficulty: input.difficulty,
        groupSizeMax: input.groupSizeMax,
        featured: input.featured,
        published: input.published,
        coverImage: input.coverImage ?? null,
        imageCredit: input.imageCredit ?? null,
        highlights: input.highlights,
        included: input.included,
        excluded: input.excluded,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted[0]) {
      throw ApiError.conflict(`The slug "${slug}" is already taken.`);
    }
    return sendSuccess(res, inserted[0], undefined, 201);
  }),
);

/** PATCH /api/admin/tours/:id — update one. */
adminContentRouter.patch(
  '/tours/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('Bad tour id.');

    const input = tourInputSchema.partial().parse(req.body);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.title !== undefined) patch.title = input.title;
    if (input.destinationId !== undefined) patch.destinationId = input.destinationId;
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priceCents !== undefined) patch.priceCents = input.priceCents;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.durationDays !== undefined) patch.durationDays = input.durationDays;
    if (input.difficulty !== undefined) patch.difficulty = input.difficulty;
    if (input.groupSizeMax !== undefined) patch.groupSizeMax = input.groupSizeMax;
    if (input.featured !== undefined) patch.featured = input.featured;
    if (input.published !== undefined) patch.published = input.published;
    if (input.coverImage !== undefined) patch.coverImage = input.coverImage ?? null;
    if (input.imageCredit !== undefined) patch.imageCredit = input.imageCredit ?? null;
    if (input.highlights !== undefined) patch.highlights = input.highlights;
    if (input.included !== undefined) patch.included = input.included;
    if (input.excluded !== undefined) patch.excluded = input.excluded;

    const [updated] = await db
      .update(tours)
      .set(patch)
      .where(eq(tours.id, id))
      .returning();

    if (!updated) throw ApiError.notFound('No tour with that id.');
    return sendSuccess(res, { ...updated, rating: Number(updated.rating) });
  }),
);

/**
 * DELETE /api/admin/tours/:id
 *
 * The foreign keys cascade the day and image ROWS away. The image FILES live
 * in Supabase Storage, so we collect their URLs first and delete the files
 * afterwards — otherwise every deleted tour would leave its photos behind.
 */
adminContentRouter.delete(
  '/tours/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('Bad tour id.');

    const images = await db
      .select({ url: tourImages.url })
      .from(tourImages)
      .where(eq(tourImages.tourId, id));

    const deleted = await db.delete(tours).where(eq(tours.id, id)).returning();
    if (!deleted[0]) throw ApiError.notFound('No tour with that id.');

    for (const image of images) {
      if (!isCmsUpload(image.url)) continue;
      const path = pathFromUrl(image.url);
      if (path) await deleteImageFile(path);
    }

    return sendSuccess(res, { id });
  }),
);

// ---------------------------------------------------------------------------
// Tour days
// ---------------------------------------------------------------------------

/** POST /api/admin/tours/:id/days — add a day to the itinerary. */
adminContentRouter.post(
  '/tours/:id/days',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const tourId = Number(req.params.id);
    if (!Number.isInteger(tourId)) throw ApiError.badRequest('Bad tour id.');

    const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) throw ApiError.notFound('No tour with that id.');

    const input = dayInputSchema.parse(req.body);

    const inserted = await db
      .insert(tourDays)
      .values({
        tourId,
        dayNumber: input.dayNumber,
        title: input.title,
        description: input.description,
        accommodation: input.accommodation ?? null,
        meals: input.meals ?? null,
        image: input.image ?? null,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted[0]) {
      throw ApiError.conflict(`Day ${input.dayNumber} already exists on this tour.`);
    }
    return sendSuccess(res, inserted[0], undefined, 201);
  }),
);

/** PATCH /api/admin/tours/:id/days/:dayId — edit a day. */
adminContentRouter.patch(
  '/tours/:id/days/:dayId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const tourId = Number(req.params.id);
    const dayId = Number(req.params.dayId);
    if (!Number.isInteger(tourId) || !Number.isInteger(dayId)) {
      throw ApiError.badRequest('Bad ids.');
    }

    const input = dayInputSchema.partial().parse(req.body);

    const patch: Record<string, unknown> = {};
    if (input.dayNumber !== undefined) patch.dayNumber = input.dayNumber;
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.accommodation !== undefined) patch.accommodation = input.accommodation ?? null;
    if (input.meals !== undefined) patch.meals = input.meals ?? null;
    if (input.image !== undefined) patch.image = input.image ?? null;

    const [updated] = await db
      .update(tourDays)
      .set(patch)
      .where(and(eq(tourDays.id, dayId), eq(tourDays.tourId, tourId)))
      .returning();

    if (!updated) throw ApiError.notFound('No day with that id on this tour.');
    return sendSuccess(res, updated);
  }),
);

/** DELETE /api/admin/tours/:id/days/:dayId — remove a day. */
adminContentRouter.delete(
  '/tours/:id/days/:dayId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const tourId = Number(req.params.id);
    const dayId = Number(req.params.dayId);
    if (!Number.isInteger(tourId) || !Number.isInteger(dayId)) {
      throw ApiError.badRequest('Bad ids.');
    }

    const deleted = await db
      .delete(tourDays)
      .where(and(eq(tourDays.id, dayId), eq(tourDays.tourId, tourId)))
      .returning();

    if (!deleted[0]) throw ApiError.notFound('No day with that id on this tour.');
    return sendSuccess(res, { id: dayId });
  }),
);

// ---------------------------------------------------------------------------
// Tour images
// ---------------------------------------------------------------------------

/** POST /api/admin/tours/:id/images — attach an image by URL. */
adminContentRouter.post(
  '/tours/:id/images',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const tourId = Number(req.params.id);
    if (!Number.isInteger(tourId)) throw ApiError.badRequest('Bad tour id.');

    const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) throw ApiError.notFound('No tour with that id.');

    const input = imageInputSchema.parse(req.body);

    const [maxRow] = await db
      .select({ value: sql<number>`coalesce(max(${tourImages.position}), -1)` })
      .from(tourImages)
      .where(eq(tourImages.tourId, tourId));

    const inserted = await db
      .insert(tourImages)
      .values({
        tourId,
        url: input.url,
        alt: input.alt,
        imageCredit: input.imageCredit ?? null,
        position: input.position ?? Number(maxRow?.value ?? -1) + 1,
      })
      .returning();

    return sendSuccess(res, inserted[0], undefined, 201);
  }),
);

/**
 * POST /api/admin/tours/:id/images/upload — upload a file from the browser.
 *
 * The file goes: browser -> API -> Supabase Storage -> back as a public URL.
 * The API never stores the bytes; it only holds them long enough to push
 * them into the bucket.
 *
 * The body is the raw image, not a multipart form. That keeps the request
 * small (no base64, no 33% overhead) and means the server needs no file
 * parsing library at all — `express.raw()` hands us a Buffer.
 *
 * The alt text travels as a query parameter because a header cannot carry
 * non-ASCII text safely.
 */
adminContentRouter.post(
  '/tours/:id/images/upload',
  raw({
    type: [...ALLOWED_IMAGE_TYPES],
    limit: MAX_IMAGE_BYTES,
  }),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const tourId = Number(req.params.id);
    if (!Number.isInteger(tourId)) throw ApiError.badRequest('Bad tour id.');

    const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) throw ApiError.notFound('No tour with that id.');

    const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw badUpload(
        `That file type is not allowed (${contentType || 'unknown'}). Use JPEG, PNG or WebP.`,
      );
    }

    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (bytes.length === 0) throw badUpload('No image data was received.');
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw badUpload(
        `That image is ${(bytes.length / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
      );
    }

    const alt = String(req.query.alt ?? '').trim().slice(0, 300) || 'Tour photo';

    const uploaded = await uploadImage(bytes, contentType);

    const [maxRow] = await db
      .select({ value: sql<number>`coalesce(max(${tourImages.position}), -1)` })
      .from(tourImages)
      .where(eq(tourImages.tourId, tourId));

    const inserted = await db
      .insert(tourImages)
      .values({
        tourId,
        url: uploaded.url,
        alt,
        imageCredit: null,
        position: Number(maxRow?.value ?? -1) + 1,
      })
      .returning();

    return sendSuccess(res, { image: inserted[0], path: uploaded.path }, undefined, 201);
  }),
);

/** DELETE /api/admin/tours/:id/images/:imageId — remove an image (and the file). */
adminContentRouter.delete(
  '/tours/:id/images/:imageId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const tourId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if (!Number.isInteger(tourId) || !Number.isInteger(imageId)) {
      throw ApiError.badRequest('Bad ids.');
    }

    const deleted = await db
      .delete(tourImages)
      .where(and(eq(tourImages.id, imageId), eq(tourImages.tourId, tourId)))
      .returning();

    if (!deleted[0]) throw ApiError.notFound('No image with that id on this tour.');

    const url = deleted[0].url;
    if (isCmsUpload(url)) {
      const path = pathFromUrl(url);
      if (path) await deleteImageFile(path);
    }

    return sendSuccess(res, { id: imageId });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';

import { getDb } from '../db/client.js';
import { destinations, reviews, tourDays, tourImages, tours } from '../db/schema.js';
import { ApiError, asyncHandler, sendSuccess } from '../lib/http.js';

export const toursRouter = Router();

/** Query-string numbers: "" and null mean "not provided". */
const numericParam = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional(),
  );

const listQuerySchema = z.object({
  q: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().min(1).max(120).optional()),
  destination: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(80).optional()),
  difficulty: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().trim().max(120).optional(),
  ),
  maxPrice: numericParam(0, 10_000_000),
  minDays: numericParam(1, 365),
  maxDays: numericParam(1, 365),
  featured: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['true', 'false']).optional(),
  ),
  sort: z
    .enum(['recommended', 'price_asc', 'price_desc', 'rating', 'duration_asc', 'duration_desc'])
    .default('recommended'),
  page: numericParam(1, 10_000),
  pageSize: numericParam(1, 60),
});

type SortKey = z.infer<typeof listQuerySchema>['sort'];

function orderBy(sort: SortKey): SQL[] {
  switch (sort) {
    case 'price_asc':
      return [asc(tours.priceCents)];
    case 'price_desc':
      return [desc(tours.priceCents)];
    case 'rating':
      return [desc(tours.rating), desc(tours.reviewCount)];
    case 'duration_asc':
      return [asc(tours.durationDays), asc(tours.priceCents)];
    case 'duration_desc':
      return [desc(tours.durationDays), asc(tours.priceCents)];
    case 'recommended':
    default:
      return [desc(tours.featured), desc(tours.rating), asc(tours.priceCents)];
  }
}

/** GET /api/tours — filterable, sortable, paginated catalogue. */
toursRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const query = listQuerySchema.parse(req.query);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    const filters: (SQL | undefined)[] = [];

    if (query.q) {
      const needle = `%${query.q}%`;
      filters.push(
        or(
          ilike(tours.title, needle),
          ilike(tours.summary, needle),
          ilike(tours.description, needle),
          ilike(destinations.name, needle),
          ilike(destinations.region, needle),
        ),
      );
    }

    if (query.destination) {
      const [destination] = await db
        .select({ id: destinations.id })
        .from(destinations)
        .where(eq(destinations.slug, query.destination))
        .limit(1);
      if (!destination) throw ApiError.badRequest(`Unknown destination "${query.destination}"`);
      filters.push(eq(tours.destinationId, destination.id));
    }

    if (query.difficulty) {
      const wanted = query.difficulty
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter((d): d is 'easy' | 'moderate' | 'challenging' =>
          d === 'easy' || d === 'moderate' || d === 'challenging',
        );
      if (wanted.length > 0) {
        filters.push(
          or(...wanted.map((d) => eq(tours.difficulty, d))),
        );
      }
    }

    if (query.maxPrice !== undefined) filters.push(lte(tours.priceCents, query.maxPrice));
    if (query.minDays !== undefined) filters.push(gte(tours.durationDays, query.minDays));
    if (query.maxDays !== undefined) filters.push(lte(tours.durationDays, query.maxDays));
    if (query.featured === 'true') filters.push(eq(tours.featured, true));

    const where = filters.length ? and(...filters) : undefined;

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
        groupSizeMax: tours.groupSizeMax,
        rating: tours.rating,
        reviewCount: tours.reviewCount,
        featured: tours.featured,
        coverImage: tours.coverImage,
        imageCredit: tours.imageCredit,
        highlights: tours.highlights,
        destination: {
          id: destinations.id,
          slug: destinations.slug,
          name: destinations.name,
          region: destinations.region,
        },
      })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(where)
      .orderBy(...orderBy(query.sort))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [totals] = await db
      .select({ value: count() })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(where);

    return sendSuccess(
      res,
      // `numeric` columns come back from Postgres as strings — normalise the
      // rating to a number so the client can do arithmetic on it.
      rows.map((row) => ({ ...row, rating: Number(row.rating) })),
      {
        page,
        pageSize,
        total: totals?.value ?? 0,
        totalPages: Math.max(1, Math.ceil((totals?.value ?? 0) / pageSize)),
        sort: query.sort,
      },
    );
  }),
);

/**
 * GET /api/tours/meta — everything the filter UI needs in one round trip:
 * price bounds, duration bounds, difficulty counts, destination counts.
 */
toursRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const db = await getDb();

    const bounds = await db
      .select({
        minPrice: tours.priceCents,
        maxPrice: tours.priceCents,
        minDays: tours.durationDays,
        maxDays: tours.durationDays,
      })
      .from(tours)
      .limit(1);

    const all = await db
      .select({
        priceCents: tours.priceCents,
        durationDays: tours.durationDays,
        difficulty: tours.difficulty,
      })
      .from(tours);

    const prices = all.map((t) => t.priceCents);
    const durations = all.map((t) => t.durationDays);

    const difficultyCounts: Record<string, number> = { easy: 0, moderate: 0, challenging: 0 };
    for (const t of all) difficultyCounts[t.difficulty] = (difficultyCounts[t.difficulty] ?? 0) + 1;

    const destinationRows = await db
      .select({
        slug: destinations.slug,
        name: destinations.name,
        region: destinations.region,
        tourCount: count(tours.id),
      })
      .from(destinations)
      .leftJoin(tours, eq(tours.destinationId, destinations.id))
      .groupBy(destinations.id)
      .orderBy(asc(destinations.name));

    return sendSuccess(res, {
      priceRange: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
      durationRange: {
        min: durations.length ? Math.min(...durations) : 1,
        max: durations.length ? Math.max(...durations) : 1,
      },
      difficultyCounts,
      destinations: destinationRows,
    });
  }),
);

/** GET /api/tours/:slug — full detail: itinerary, gallery, reviews. */
toursRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const slug = req.params.slug;

    const [tour] = await db
      .select()
      .from(tours)
      .where(eq(tours.slug, slug))
      .limit(1);

    if (!tour) throw ApiError.notFound(`No tour called "${slug}"`);

    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, tour.destinationId))
      .limit(1);

    const days = await db
      .select()
      .from(tourDays)
      .where(eq(tourDays.tourId, tour.id))
      .orderBy(asc(tourDays.dayNumber));

    const images = await db
      .select()
      .from(tourImages)
      .where(eq(tourImages.tourId, tour.id))
      .orderBy(asc(tourImages.position));

    const tourReviews = await db
      .select({
        id: reviews.id,
        authorName: reviews.authorName,
        authorCountry: reviews.authorCountry,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.tourId, tour.id))
      .orderBy(desc(reviews.createdAt));

    const relatedRows = await db
      .select({
        slug: tours.slug,
        title: tours.title,
        priceCents: tours.priceCents,
        currency: tours.currency,
        durationDays: tours.durationDays,
        coverImage: tours.coverImage,
        rating: tours.rating,
        reviewCount: tours.reviewCount,
        destination: {
          id: destinations.id,
          slug: destinations.slug,
          name: destinations.name,
          region: destinations.region,
        },
      })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(eq(tours.destinationId, tour.destinationId))
      .orderBy(asc(tours.priceCents))
      .limit(5);

    let related = relatedRows
      .filter((t) => t.slug !== slug)
      .map((t) => ({ ...t, rating: Number(t.rating) }))
      .slice(0, 3);

    // Top up with featured tours from elsewhere so the row is never sparse.
    if (related.length < 3) {
      const fillers = await db
        .select({
          slug: tours.slug,
          title: tours.title,
          priceCents: tours.priceCents,
          currency: tours.currency,
          durationDays: tours.durationDays,
          coverImage: tours.coverImage,
          rating: tours.rating,
          reviewCount: tours.reviewCount,
          destination: {
            id: destinations.id,
            slug: destinations.slug,
            name: destinations.name,
            region: destinations.region,
          },
        })
        .from(tours)
        .innerJoin(destinations, eq(tours.destinationId, destinations.id))
        .where(sql`${tours.slug} <> ${slug}`)
        .orderBy(desc(tours.featured), desc(tours.rating))
        .limit(6);

      const taken = new Set(related.map((t) => t.slug));
      for (const filler of fillers) {
        if (related.length >= 3) break;
        if (taken.has(filler.slug)) continue;
        related.push({ ...filler, rating: Number(filler.rating) });
      }
    }

    return sendSuccess(res, {
      ...tour,
      rating: Number(tour.rating),
      destination,
      days,
      images,
      reviews: tourReviews,
      related,
    });
  }),
);

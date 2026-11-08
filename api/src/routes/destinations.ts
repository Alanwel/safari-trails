import { Router } from 'express';
import { asc, count, eq } from 'drizzle-orm';

import { getDb } from '../db/client.js';
import { destinations, tours } from '../db/schema.js';
import { ApiError, asyncHandler, sendSuccess } from '../lib/http.js';

export const destinationsRouter = Router();

/** GET /api/destinations — list every destination with its tour count. */
destinationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = await getDb();

    const rows = await db
      .select({
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
        region: destinations.region,
        tagline: destinations.tagline,
        description: destinations.description,
        coverImage: destinations.coverImage,
        imageCredit: destinations.imageCredit,
        highlights: destinations.highlights,
        bestSeason: destinations.bestSeason,
        averageDays: destinations.averageDays,
        tourCount: count(tours.id),
      })
      .from(destinations)
      .leftJoin(tours, eq(tours.destinationId, destinations.id))
      .groupBy(destinations.id)
      .orderBy(asc(destinations.name));

    return sendSuccess(res, rows);
  }),
);

/** GET /api/destinations/:slug — one destination plus the tours it offers. */
destinationsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const slug = req.params.slug;

    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, slug))
      .limit(1);

    if (!destination) throw ApiError.notFound(`No destination called "${slug}"`);

    const related = await db
      .select({
        id: tours.id,
        slug: tours.slug,
        title: tours.title,
        summary: tours.summary,
        priceCents: tours.priceCents,
        currency: tours.currency,
        durationDays: tours.durationDays,
        difficulty: tours.difficulty,
        rating: tours.rating,
        reviewCount: tours.reviewCount,
        coverImage: tours.coverImage,
        featured: tours.featured,
      })
      .from(tours)
      .where(eq(tours.destinationId, destination.id))
      .orderBy(asc(tours.priceCents));

    return sendSuccess(res, {
      ...destination,
      tours: related.map((t) => ({ ...t, rating: Number(t.rating) })),
    });
  }),
);

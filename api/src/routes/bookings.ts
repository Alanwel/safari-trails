import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { getDb } from '../db/client.js';
import { bookings, tours } from '../db/schema.js';
import { ApiError, asyncHandler, sendSuccess } from '../lib/http.js';
import { bookingReference } from '../lib/helpers.js';

export const bookingsRouter = Router();

const bookingSchema = z.object({
  tourSlug: z.string().trim().min(1, 'Choose a tour'),
  customerName: z.string().trim().min(2, 'Tell us your name').max(120),
  customerEmail: z.string().trim().email('Enter a valid email address'),
  customerPhone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : undefined)),
  travellers: z.coerce.number().int().min(1, 'At least one traveller').max(40),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'That date does not exist'),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

/**
 * POST /api/bookings — create a booking request.
 *
 * The price is *always* recalculated on the server from the tour record.
 * A client that sends its own total is ignored — never trust the browser.
 */
bookingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const input = bookingSchema.parse(req.body);

    const [tour] = await db
      .select({
        id: tours.id,
        slug: tours.slug,
        title: tours.title,
        priceCents: tours.priceCents,
        currency: tours.currency,
        groupSizeMax: tours.groupSizeMax,
        durationDays: tours.durationDays,
      })
      .from(tours)
      .where(eq(tours.slug, input.tourSlug))
      .limit(1);

    if (!tour) throw ApiError.notFound(`No tour called "${input.tourSlug}"`);

    if (input.travellers > tour.groupSizeMax) {
      throw ApiError.badRequest(
        `This tour takes at most ${tour.groupSizeMax} travellers per booking`,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (input.startDate < today) {
      throw ApiError.badRequest('Choose a start date in the future');
    }

    const totalCents = tour.priceCents * input.travellers;

    const reference = bookingReference();
    const [booking] = await db
      .insert(bookings)
      .values({
        reference,
        tourId: tour.id,
        tourSlug: tour.slug,
        tourTitle: tour.title,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone ?? null,
        travellers: input.travellers,
        startDate: input.startDate,
        message: input.message ?? null,
        status: 'pending',
        totalCents,
      })
      .returning();

    return sendSuccess(
      res,
      {
        reference: booking.reference,
        status: booking.status,
        tourTitle: booking.tourTitle,
        tourSlug: booking.tourSlug,
        travellers: booking.travellers,
        startDate: booking.startDate,
        totalCents: booking.totalCents,
        currency: tour.currency,
      },
      undefined,
      201,
    );
  }),
);

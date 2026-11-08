import { Router } from 'express';
import { z } from 'zod';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';

import { getDb } from '../db/client.js';
import { bookings, inquiries } from '../db/schema.js';
import { ApiError, asyncHandler, sendSuccess } from '../lib/http.js';
import { requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

// Everything below this line needs a valid admin token.
adminRouter.use(requireAdmin);

const listSchema = z.object({
  status: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().optional()),
  q: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(120).optional()),
  page: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).max(10_000).optional(),
  ),
  pageSize: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).max(100).optional(),
  ),
});

/** GET /api/admin/bookings — every booking, newest first. */
adminRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const query = listSchema.parse(req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const filters = [];
    if (query.status && query.status !== 'all') {
      filters.push(eq(bookings.status, query.status as 'pending'));
    }
    if (query.q) {
      const needle = `%${query.q}%`;
      filters.push(
        or(
          ilike(bookings.reference, needle),
          ilike(bookings.customerName, needle),
          ilike(bookings.customerEmail, needle),
          ilike(bookings.tourTitle, needle),
        ),
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(bookings)
      .where(where)
      .orderBy(desc(bookings.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [totals] = await db
      .select({ value: count() })
      .from(bookings)
      .where(where);

    return sendSuccess(res, rows, {
      page,
      pageSize,
      total: totals?.value ?? 0,
      totalPages: Math.max(1, Math.ceil((totals?.value ?? 0) / pageSize)),
    });
  }),
);

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
});

/** PATCH /api/admin/bookings/:reference — move a booking through the funnel. */
adminRouter.patch(
  '/bookings/:reference',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const input = statusSchema.parse(req.body);

    const [booking] = await db
      .update(bookings)
      .set({ status: input.status })
      .where(eq(bookings.reference, req.params.reference.toUpperCase()))
      .returning();

    if (!booking) throw ApiError.notFound(`No booking with reference ${req.params.reference}`);

    return sendSuccess(res, booking);
  }),
);

/** GET /api/admin/stats — numbers for the dashboard header. */
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const db = await getDb();

    const statusRows = await db
      .select({ status: bookings.status, value: count() })
      .from(bookings)
      .groupBy(bookings.status);

    const [revenue] = await db
      .select({
        value: sql<number>`coalesce(sum(${bookings.totalCents}), 0)`,
      })
      .from(bookings)
      .where(or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'completed')));

    const [inquiryRows] = await db
      .select({ value: count() })
      .from(inquiries);

    const [travellerRows] = await db
      .select({ value: sql<number>`coalesce(sum(${bookings.travellers}), 0)` })
      .from(bookings);

    const byStatus: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    };
    for (const row of statusRows ?? []) byStatus[row.status] = row.value;

    return sendSuccess(res, {
      byStatus,
      totalBookings: Object.values(byStatus).reduce((a, b) => a + b, 0),
      confirmedRevenueCents: Number(revenue?.value ?? 0),
      travellers: Number(travellerRows?.value ?? 0),
      openInquiries: inquiryRows?.value ?? 0,
    });
  }),
);

/** GET /api/admin/inquiries — contact-form messages. */
adminRouter.get(
  '/inquiries',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const rows = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(50);
    return sendSuccess(res, rows);
  }),
);

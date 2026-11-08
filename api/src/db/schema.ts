/**
 * Database schema.
 *
 * This file is the *typed* view of the database. The actual DDL lives in
 * `supabase/schema.sql` and is the single source of truth — the same file is
 * executed against PGlite locally and against Supabase in production.
 *
 * `drizzle-orm` is used as a query builder only (no drizzle-kit migrations),
 * which keeps the schema in one readable place and removes a whole class of
 * "my local DB and my hosted DB drifted apart" bugs.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const tourDifficultyEnum = pgEnum('tour_difficulty', [
  'easy',
  'moderate',
  'challenging',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
]);

/** Attribution for a photo: title, photographer, licence, source page. */
export type ImageCredit = {
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
};

export const destinations = pgTable(
  'destinations',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    region: text('region').notNull(),
    tagline: text('tagline').notNull(),
    description: text('description').notNull(),
    coverImage: text('cover_image'),
    imageCredit: jsonb('image_credit').$type<ImageCredit | null>(),
    highlights: jsonb('highlights').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    bestSeason: text('best_season'),
    averageDays: integer('average_days'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('destinations_slug_idx').on(t.slug)],
);

export const tours = pgTable(
  'tours',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    destinationId: integer('destination_id')
      .notNull()
      .references(() => destinations.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    description: text('description').notNull(),
    /** All money is stored in minor units (cents) to dodge float rounding. */
    priceCents: integer('price_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    durationDays: integer('duration_days').notNull(),
    difficulty: tourDifficultyEnum('difficulty').notNull().default('moderate'),
    groupSizeMax: integer('group_size_max').notNull().default(8),
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0'),
    reviewCount: integer('review_count').notNull().default(0),
    featured: boolean('featured').notNull().default(false),
    coverImage: text('cover_image'),
    imageCredit: jsonb('image_credit').$type<ImageCredit | null>(),
    highlights: jsonb('highlights').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    included: jsonb('included').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    excluded: jsonb('excluded').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tours_slug_idx').on(t.slug),
    index('tours_destination_idx').on(t.destinationId),
    index('tours_featured_idx').on(t.featured),
    index('tours_price_idx').on(t.priceCents),
    index('tours_duration_idx').on(t.durationDays),
  ],
);

export const tourDays = pgTable(
  'tour_days',
  {
    id: serial('id').primaryKey(),
    tourId: integer('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    accommodation: text('accommodation'),
    meals: text('meals'),
    image: text('image'),
  },
  (t) => [index('tour_days_tour_idx').on(t.tourId)],
);

export const tourImages = pgTable(
  'tour_images',
  {
    id: serial('id').primaryKey(),
    tourId: integer('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt').notNull(),
    imageCredit: jsonb('image_credit').$type<ImageCredit | null>(),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('tour_images_tour_idx').on(t.tourId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    tourId: integer('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    authorName: text('author_name').notNull(),
    authorCountry: text('author_country'),
    rating: integer('rating').notNull(),
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('reviews_tour_idx').on(t.tourId)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    /** Human-friendly reference, e.g. ST-7QK4M2. Shown to the customer. */
    reference: text('reference').notNull().unique(),
    tourId: integer('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'restrict' }),
    /** Snapshot of the tour at booking time — a booking must not change if the
     *  tour is later renamed or repriced. */
    tourSlug: text('tour_slug').notNull(),
    tourTitle: text('tour_title').notNull(),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone'),
    travellers: integer('travellers').notNull().default(1),
    startDate: date('start_date').notNull(),
    message: text('message'),
    status: bookingStatusEnum('status').notNull().default('pending'),
    totalCents: integer('total_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('bookings_reference_idx').on(t.reference),
    index('bookings_status_idx').on(t.status),
    index('bookings_created_idx').on(t.createdAt),
  ],
);

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable(
  'admin_users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('admin'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('admin_users_email_idx').on(t.email)],
);

export const schema = {
  destinations,
  tours,
  tourDays,
  tourImages,
  reviews,
  bookings,
  inquiries,
  adminUsers,
};

export type Destination = typeof destinations.$inferSelect;
export type Tour = typeof tours.$inferSelect;
export type TourDay = typeof tourDays.$inferSelect;
export type TourImage = typeof tourImages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;

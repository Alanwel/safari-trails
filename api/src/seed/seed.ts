/**
 * Seed the database with the catalogue, the itineraries, the reviews and an
 * admin account.
 *
 * Safe to run repeatedly — it clears the content tables first and re-inserts.
 */
import { existsSync, readFileSync } from 'node:fs';

import bcrypt from 'bcryptjs';

import { closeDb, getDb } from '../db/client.js';
import { repoPath } from '../db/paths.js';
import {
  adminUsers,
  bookings,
  destinations,
  inquiries,
  reviews,
  tourDays,
  tourImages,
  tours,
} from '../db/schema.js';
import { env } from '../env.js';
import { adminUser, destinations as destinationSeed, tours as tourSeed } from './data.js';

type ManifestEntry = {
  file: string;
  credit?: {
    title: string;
    artist: string;
    license: string;
    sourceUrl: string;
  };
};

type Manifest = {
  destinations?: Record<string, ManifestEntry>;
  tours?: Record<string, ManifestEntry & { gallery?: (ManifestEntry & { alt?: string })[] }>;
};

function loadManifest(): Manifest {
  const file = repoPath('assets', 'images.json');
  if (!existsSync(file)) {
    console.log('[seed] no assets/images.json yet — seeding without photos.');
    console.log('[seed] run `npm run images` to fetch them, then re-seed.');
    return {};
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Manifest;
  } catch (err) {
    console.warn('[seed] could not parse assets/images.json:', err);
    return {};
  }
}

export async function seed() {
  const db = await getDb();
  const manifest = loadManifest();

  // Clear content tables (admin_users is replaced below, bookings/inquiries too).
  await db.delete(bookings);
  await db.delete(inquiries);
  await db.delete(tourImages);
  await db.delete(tourDays);
  await db.delete(reviews);
  await db.delete(tours);
  await db.delete(destinations);
  await db.delete(adminUsers);

  const destinationIds = new Map<string, number>();

  for (const d of destinationSeed) {
    const image = manifest.destinations?.[d.slug];
    const [row] = await db
      .insert(destinations)
      .values({
        slug: d.slug,
        name: d.name,
        region: d.region,
        tagline: d.tagline,
        description: d.description,
        coverImage: image?.file ?? null,
        imageCredit: image?.credit ?? null,
        highlights: d.highlights,
        bestSeason: d.bestSeason,
        averageDays: d.averageDays,
      })
      .returning({ id: destinations.id });
    destinationIds.set(d.slug, row.id);
  }

  let imageCount = 0;
  let reviewCount = 0;

  for (const t of tourSeed) {
    const destinationId = destinationIds.get(t.destinationSlug);
    if (!destinationId) throw new Error(`Unknown destination slug: ${t.destinationSlug}`);

    const image = manifest.tours?.[t.slug];

    const [tourRow] = await db
      .insert(tours)
      .values({
        slug: t.slug,
        title: t.title,
        destinationId,
        summary: t.summary,
        description: t.description,
        priceCents: t.priceCents,
        currency: 'USD',
        durationDays: t.durationDays,
        difficulty: t.difficulty,
        groupSizeMax: t.groupSizeMax,
        rating: String(t.rating),
        reviewCount: t.reviewCount,
        featured: t.featured,
        coverImage: image?.file ?? null,
        imageCredit: image?.credit ?? null,
        highlights: t.highlights,
        included: t.included,
        excluded: t.excluded,
      })
      .returning({ id: tours.id });

    for (const day of t.days) {
      await db.insert(tourDays).values({
        tourId: tourRow.id,
        dayNumber: t.days.indexOf(day) + 1,
        title: day.title,
        description: day.description,
        accommodation: day.accommodation,
        meals: day.meals,
      });
    }

    for (const [index, galleryImage] of (image?.gallery ?? []).entries()) {
      await db.insert(tourImages).values({
        tourId: tourRow.id,
        url: galleryImage.file,
        alt: galleryImage.alt ?? `${t.title} — photo ${index + 1}`,
        imageCredit: galleryImage.credit ?? null,
        position: index,
      });
      imageCount += 1;
    }

    for (const r of t.reviews) {
      await db.insert(reviews).values({
        tourId: tourRow.id,
        authorName: r.authorName,
        authorCountry: r.authorCountry,
        rating: r.rating,
        comment: r.comment,
      });
      reviewCount += 1;
    }
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await db.insert(adminUsers).values({
    email: adminUser.email.toLowerCase(),
    passwordHash,
    name: adminUser.name,
    role: adminUser.role,
  });

  console.log(
    `[seed] ${destinationSeed.length} destinations, ${tourSeed.length} tours, ` +
      `${imageCount} gallery images, ${reviewCount} reviews, 1 admin user`,
  );
  console.log(`[seed] admin login -> ${adminUser.email} / ${env.ADMIN_PASSWORD}`);
}

async function main() {
  await seed();
  await closeDb();
}

const isDirectRun = process.argv[1]?.includes('seed');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
}

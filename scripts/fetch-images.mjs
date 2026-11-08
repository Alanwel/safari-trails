#!/usr/bin/env node
/**
 * Fetch real photography for the catalogue from Wikimedia Commons.
 *
 * Why Wikimedia and not a stock site:
 *   * the photos are genuinely of the places on the site (Bwindi gorillas,
 *     Murchison Falls, Lake Bunyonyi) rather than generic sunsets;
 *   * every image carries a licence and an author, and we keep that
 *     attribution in the database and on the page;
 *   * no API key, no rate-limit surprises.
 *
 * Usage:
 *   node scripts/fetch-images.mjs            # fetch anything missing
 *   node scripts/fetch-images.mjs --force    # re-fetch everything
 *
 * Writes:
 *   web/public/images/**                    the image files
 *   assets/images.json                       manifest consumed by the seeder
 */
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const IMAGE_DIR = join(ROOT, 'web', 'public', 'images');
const MANIFEST = join(ROOT, 'assets', 'images.json');

const FORCE = process.argv.includes('--force');
const USER_AGENT = 'SafariTrailsSiteBuilder/1.0 (educational demo project; contact: dev@example.com)';

/** What we want a photo of, per destination and per tour. */
const PLAN = {
  destinations: {
    'bwindi-impenetrable-forest': {
      query: 'Bwindi Impenetrable Forest Uganda',
      alt: 'Mountain gorilla in Bwindi Impenetrable Forest',
    },
    'queen-elizabeth-national-park': {
      query: 'Queen Elizabeth National Park Uganda wildlife',
      alt: 'Savanna in Queen Elizabeth National Park',
    },
    'murchison-falls-national-park': {
      query: 'Murchison Falls Uganda',
      alt: 'Murchison Falls on the Nile',
    },
    'lake-bunyonyi': {
      query: 'Lake Bunyonyi Uganda islands',
      alt: 'Islands on Lake Bunyonyi',
    },
    'jinja-and-the-source-of-the-nile': {
      query: 'Source of the Nile Uganda Jinja',
      alt: 'The Source of the Nile at Jinja',
    },
    'rwenzori-mountains': {
      query: 'Rwenzori Mountains Uganda snow',
      alt: 'Snow-capped Rwenzori Mountains',
    },
    'kampala-and-the-cultural-heartland': {
      query: 'Kampala Uganda city',
      alt: 'Kampala, Uganda',
    },
  },
  tours: {
    'mountain-gorilla-trekking-bwindi': {
      query: 'Mountain Gorilla Bwindi Uganda',
      alt: 'Mountain gorilla family in Bwindi',
      gallery: [
        { query: 'Bwindi Impenetrable National Park Uganda', alt: 'Trail through Bwindi forest' },
        { query: 'mountain gorilla Uganda Bwindi', alt: 'Mountain gorilla in Bwindi' },
        { query: 'gorilla family Uganda', alt: 'Gorilla family feeding' },
      ],
    },
    'bwindi-forest-walk-batwa-village': {
      query: 'Batwa people Uganda',
      alt: 'Batwa community in Uganda',
      gallery: [
        { query: 'Bamboo forest Uganda', alt: 'Bamboo forest' },
        { query: 'Bwindi forest Uganda', alt: 'Lower forest trail' },
      ],
    },
    'queen-elizabeth-royal-tour': {
      query: 'Queen Elizabeth National Park Uganda',
      alt: 'Elephants in Queen Elizabeth National Park',
      gallery: [
        { query: 'Kazinga Channel Uganda', alt: 'Kazinga Channel' },
        { query: 'Kyambura Gorge Uganda', alt: 'Kyambura Gorge waterfall' },
        { query: 'lion Uganda tree', alt: 'Lion resting in Ishasha' },
      ],
    },
    'murchison-falls-nile-safari': {
      query: 'Murchison Falls Uganda Nile',
      alt: 'Murchison Falls on the Nile',
      gallery: [
        { query: 'shoebill Uganda', alt: 'Shoebill stork' },
        { query: 'elephant Uganda savanna', alt: 'Elephant herd' },
        { query: 'Victoria Nile Uganda', alt: 'The Nile in Murchison' },
      ],
    },
    'murchison-falls-helicopter-bush-dinner': {
      query: 'Murchison Falls sunset Uganda',
      alt: 'Murchison Falls at sunset',
      gallery: [{ query: 'Murchison Falls Uganda', alt: 'Aerial view of the falls' }],
    },
    'lake-bunyonyi-island-hopping': {
      query: 'Lake Bunyonyi Uganda',
      alt: 'Lake Bunyonyi at sunrise',
      gallery: [
        { query: 'dugout canoe Uganda lake', alt: 'Dugout canoe on the lake' },
        { query: 'Bunyonyi Uganda island', alt: 'Island on Lake Bunyonyi' },
        { query: 'Rwenzori mountains from Lake Bunyonyi', alt: 'Rwenzori range from Bunyonyi' },
      ],
    },
    'jinja-nile-rafting-ziwa-rhino': {
      query: 'Jinja Uganda Nile',
      alt: 'The Nile at Jinja',
      gallery: [
        { query: 'white water rafting Uganda Nile', alt: 'Rafting the Nile' },
        { query: 'Source of the Nile Uganda', alt: 'Source of the Nile' },
        { query: 'Ziwa Rhino Sanctuary Uganda', alt: 'Rhino at Ziwa Sanctuary' },
      ],
    },
    'white-water-rafting-nile-jinja': {
      query: 'rafting the Nile Uganda',
      alt: 'White-water rafting on the Nile',
      gallery: [{ query: 'Nile rafting rapids', alt: 'Grade IV rapids' }],
    },
    'rwenzori-mountains-margherita-hut-trek': {
      query: 'Rwenzori Mountains Uganda glacier',
      alt: 'Rwenzori glaciers',
      gallery: [
        { query: 'Rwenzori Mountains trekking Uganda', alt: 'Trekking the Rwenzori' },
        { query: 'Rwenzori Uganda landscape', alt: 'Rwenzori moorland' },
        { query: 'Mount Stanley Uganda', alt: 'Mount Stanley' },
      ],
    },
    'kampala-city-cultural-tour': {
      query: 'Kampala Uganda',
      alt: 'Kampala city',
      gallery: [
        { query: 'Kasubi Tombs Uganda', alt: 'Kasubi Tombs' },
        { query: 'Uganda Museum Kampala', alt: 'Uganda Museum' },
      ],
    },
  },
};

/** Strip the HTML that Wikimedia embeds in artist/description fields. */
function stripHtml(value = '') {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const usedTitles = new Set();

async function searchCommons(query, limit = 12) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}` +
    '&gsrnamespace=6&gsrlimit=' + limit +
    '&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1800&format=json&origin=*';

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Commons search failed (${res.status}) for "${query}"`);
  const data = await res.json();

  const pages = Object.values(data?.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata ?? {};
      return {
        title: page.title,
        mime: info.mime,
        width: info.width ?? 0,
        thumbUrl: info.thumburl,
        originalUrl: info.url,
        credit: {
          title: stripHtml(meta.ObjectName?.value) || page.title.replace(/^File:/, ''),
          artist: stripHtml(meta.Artist?.value) || 'Unknown photographer',
          license: stripHtml(meta.LicenseShortName?.value) || 'See source page',
          sourceUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${page.title}`,
        },
      };
    })
    .filter(Boolean);
}

async function download(url, destinationPath) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 12_000) throw new Error('image too small, skipping');
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, buffer);
  return buffer.length;
}

/** Find the best unused image for a query, download it, return the entry. */
async function pickOne(query, alt, outFile) {
  const candidates = await searchCommons(query);

  for (const candidate of candidates) {
    if (!candidate.mime?.startsWith('image/')) continue;
    if (!candidate.thumbUrl) continue;
    if (candidate.width < 1000) continue;
    if (usedTitles.has(candidate.title)) continue;

    const extension = candidate.mime === 'image/png' ? 'png' : 'jpg';
    const target = join(IMAGE_DIR, outFile.replace(/\.jpg$/, `.${extension}`));

    if (!FORCE && existsSync(target)) {
      usedTitles.add(candidate.title);
      return {
        file: `/images/${outFile.replace(/^\/?/, '').replace(/\.jpg$/, `.${extension}`)}`,
        alt,
        credit: candidate.credit,
      };
    }

    try {
      await download(candidate.thumbUrl, target);
      usedTitles.add(candidate.title);
      return {
        file: `/images/${outFile.replace(/^\/?/, '').replace(/\.jpg$/, `.${extension}`)}`,
        alt,
        credit: candidate.credit,
      };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function main() {
  await mkdir(IMAGE_DIR, { recursive: true });
  await mkdir(dirname(MANIFEST), { recursive: true });

  let manifest = {};
  if (existsSync(MANIFEST)) {
    try {
      manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
    } catch {
      manifest = {};
    }
  }
  manifest.destinations ??= {};
  manifest.tours ??= {};

  let fetched = 0;
  let skipped = 0;

  for (const [slug, spec] of Object.entries(PLAN.destinations)) {
    const outFile = `destinations/${slug}.jpg`;
    const existing = manifest.destinations[slug];
    if (!FORCE && existing && existsSync(join(ROOT, 'web', 'public', existing.file.replace(/^\//, '')))) {
      skipped += 1;
      console.log(`  · ${slug} (cached)`);
      continue;
    }

    const entry = await pickOne(spec.query, spec.alt, outFile);
    if (entry) {
      manifest.destinations[slug] = { file: entry.file, credit: entry.credit };
      fetched += 1;
      console.log(`  ✓ ${slug} -> ${entry.file}`);
    } else {
      skipped += 1;
      console.log(`  ! ${slug} -> no usable image found`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  for (const [slug, spec] of Object.entries(PLAN.tours)) {
    const outFile = `tours/${slug}.jpg`;
    const existing = manifest.tours[slug];
    if (!FORCE && existing && existsSync(join(ROOT, 'web', 'public', existing.file.replace(/^\//, '')))) {
      skipped += 1;
      console.log(`  · ${slug} (cached)`);
      continue;
    }

    const cover = await pickOne(spec.query, spec.alt, outFile);
    if (!cover) {
      skipped += 1;
      console.log(`  ! ${slug} -> no cover image`);
      continue;
    }

    const gallery = [];
    for (const [index, shot] of (spec.gallery ?? []).entries()) {
      const entry = await pickOne(
        shot.query,
        shot.alt,
        `tours/${slug}-${index + 1}.jpg`,
      );
      if (entry) {
        // The Commons file title describes the *actual* photo, which a
        // hand-written intent cannot guarantee. Use it for the alt text.
        gallery.push({
          file: entry.file,
          alt: entry.credit.title,
          credit: entry.credit,
        });
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    manifest.tours[slug] = { file: cover.file, credit: cover.credit, gallery };
    fetched += 1;
    console.log(`  ✓ ${slug} -> ${cover.file} (+${gallery.length} gallery)`);
    await new Promise((r) => setTimeout(r, 250));
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n[images] ${fetched} fetched, ${skipped} skipped.`);
  console.log(`[images] manifest -> ${MANIFEST}`);

  const size = await stat(MANIFEST);
  console.log(`[images] manifest size ${(size.size / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('[images] failed:', err);
  process.exit(1);
});

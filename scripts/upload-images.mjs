#!/usr/bin/env node
/**
 * Upload the tour photography to Supabase Storage and point the database at
 * the storage URLs.
 *
 * Why bother: images stored in the repository are served by the web app's
 * own origin. Moving them to Supabase Storage means:
 *   * the images are served from a CDN
 *   * the repository stays small
 *   * a new operator can swap the bucket without touching the code
 *
 * Usage (from the repo root):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   node scripts/upload-images.mjs
 *
 * The service-role key bypasses Row Level Security — it must never be
 * committed, and never sent to the browser.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? 'tour-images';
const MANIFEST = join(ROOT, 'assets', 'images.json');
const IMAGE_DIR = join(ROOT, 'web', 'public');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing credentials.\n\n' +
      '  SUPABASE_URL=https://<project-ref>.supabase.co \\\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \\\n' +
      '  node scripts/upload-images.mjs\n',
  );
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Which bucket an image path belongs in, based on its folder. */
function bucketFor(path) {
  return BUCKET;
}

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error) {
    console.log(`[upload] creating bucket "${BUCKET}"…`);
    const created = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (created.error) {
      console.error('[upload] could not create the bucket:', created.error.message);
      process.exit(1);
    }
    return;
  }
  if (!data.public) {
    console.log(`[upload] making bucket "${BUCKET}" public…`);
    await supabase.storage.updateBucket(BUCKET, { public: true });
  }
}

async function uploadOne(localPath, storagePath) {
  const buffer = await readFile(localPath);

  const { error } = await supabase.storage.from(bucketFor(storagePath)).upload(storagePath, buffer, {
    contentType: localPath.endsWith('.png') ? 'image/png' : 'image/jpeg',
    upsert: true,
  });

  if (error) throw new Error(`${storagePath}: ${error.message}`);

  return supabase.storage.from(bucketFor(storagePath)).getPublicUrl(storagePath).data.publicUrl;
}

async function main() {
  if (!existsSync(MANIFEST)) {
    console.error('[upload] assets/images.json not found — run `npm run images` first.');
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  await ensureBucket();

  const mappings = [];

  const collect = (entry) => {
    if (!entry?.file) return;
    mappings.push({ from: entry.file, storagePath: entry.file.replace(/^\/images\//, '') });
  };

  for (const entry of Object.values(manifest.destinations ?? {})) collect(entry);
  for (const tour of Object.values(manifest.tours ?? {})) {
    collect(tour);
    for (const shot of tour.gallery ?? []) collect(shot);
  }

  console.log(`[upload] ${mappings.length} images -> bucket "${BUCKET}"`);

  let uploaded = 0;
  const urlMap = {};

  for (const { from, storagePath } of mappings) {
    const localPath = join(IMAGE_DIR, from.replace(/^\//, ''));
    if (!existsSync(localPath)) {
      console.warn(`[upload] missing locally, skipping: ${from}`);
      continue;
    }
    try {
      const publicUrl = await uploadOne(localPath, storagePath);
      urlMap[from] = publicUrl;
      uploaded += 1;
      process.stdout.write(`\r[upload] ${uploaded}/${mappings.length}`);
    } catch (err) {
      console.warn(`\n[upload] failed ${storagePath}: ${err.message}`);
    }
  }

  console.log(`\n[upload] uploaded ${uploaded} images`);

  // Rewrite the manifest so the next seed points at the storage URLs.
  const rewrite = (entry) => {
    if (!entry) return entry;
    if (entry.file && urlMap[entry.file]) entry.file = urlMap[entry.file];
    if (entry.gallery) entry.gallery = entry.gallery.map(rewrite);
    return entry;
  };

  for (const key of Object.keys(manifest.destinations ?? {})) {
    manifest.destinations[key] = rewrite(manifest.destinations[key]);
  }
  for (const key of Object.keys(manifest.tours ?? {})) {
    manifest.tours[key] = rewrite(manifest.tours[key]);
  }

  await (await import('node:fs/promises')).writeFile(
    MANIFEST,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log('[upload] manifest updated with the storage URLs.');
  console.log('[upload] now run `npm run db:seed` to point the database at them.');
}

main().catch((err) => {
  console.error('[upload] failed:', err);
  process.exit(1);
});

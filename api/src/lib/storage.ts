/**
 * Supabase Storage access for CMS image uploads.
 *
 * ---------------------------------------------------------------------------
 * Why this is not just "use the service role key"
 * ---------------------------------------------------------------------------
 * The service role key bypasses *every* RLS policy in the database. Handing it
 * to the API means a bug in one route could write to bookings, admin_users or
 * another app's tables sharing this database. So we do NOT use it.
 *
 * Instead the API signs in as a dedicated low-privilege machine account
 * (`cms@safaritrails.com`) with the *public* anon key, and the storage
 * policies decide what that account may write:
 *
 *   insert/update/delete on storage.objects
 *     where bucket_id = 'tour-images'
 *       and (storage.foldername(name))[1] = 'cms'   -- only the cms/ folder
 *       and auth.email() = 'cms@safaritrails.com'  -- and only that account
 *
 * Blast radius of a bug in the CMS: a few files inside tour-images/cms/.
 * Nothing else in the database is reachable.
 *
 * The account is created once (see docs/DEPLOY.md) and its password lives in
 * `CMS_STORAGE_PASSWORD`. It is a *machine* account — it never signs in
 * through the browser and has no admin_users row, so it cannot touch the
 * catalogue directly.
 */
import { env } from '../env.js';
import { ApiError } from './http.js';

export const TOUR_IMAGE_BUCKET = 'tour-images';

/** Every CMS upload goes under this folder. The storage policy keys on it. */
export const CMS_PREFIX = 'cms';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Vercel's serverless functions cap a request body at 4.5 MB, so an upload
 * larger than this would be rejected by the platform before our code runs.
 * 3 MB leaves room for the multipart envelope.
 */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** The machine account that is allowed to write into tour-images/cms. */
const STORAGE_EMAIL = 'cms@safaritrails.com';

type CachedToken = { token: string; expiresAt: number };

let cached: CachedToken | null = null;

export function storageConfigured(): boolean {
  return (
    env.SUPABASE_URL.trim().length > 0 &&
    env.SUPABASE_ANON_KEY.trim().length > 0 &&
    env.CMS_STORAGE_PASSWORD.trim().length > 0
  );
}

/**
 * Sign in as the machine account and return a Supabase access token.
 *
 * The token is cached until shortly before it expires — signing in on every
 * upload would double the request count and risk hitting GoTrue's rate limit.
 */
async function getStorageToken(): Promise<string> {
  if (!storageConfigured()) {
    throw ApiError.internal(
      'Image uploads are not configured on this server (SUPABASE_URL / SUPABASE_ANON_KEY / CMS_STORAGE_PASSWORD). You can still add an image by pasting its URL.',
    );
  }

  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: STORAGE_EMAIL,
      password: env.CMS_STORAGE_PASSWORD,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw ApiError.internal(
      `Could not sign in to the image store (${res.status}). Check CMS_STORAGE_PASSWORD. ${body.slice(0, 160)}`,
    );
  }

  const payload = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw ApiError.internal('The image store did not return an access token.');
  }

  cached = {
    token: payload.access_token,
    // Refresh a minute early so a request never starts with a token that
    // expires mid-flight.
    expiresAt: Date.now() + Math.max(60, (payload.expires_in ?? 3600) - 60) * 1000,
  };
  return cached.token;
}

function extensionFor(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

/** Turn a stored path into the public URL the browser will load. */
export function publicUrlFor(path: string): string {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${TOUR_IMAGE_BUCKET}/${path}`;
}

export type UploadResult = { path: string; url: string };

/**
 * Upload bytes into the CMS folder of the tour-images bucket.
 *
 * Returns the storage path (what we save in the database) and the public URL
 * (what we save as the image's `url`).
 */
export async function uploadImage(
  bytes: Buffer,
  contentType: string,
): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw ApiError.badRequest(
      `That image type is not allowed. Use one of: ${ALLOWED_IMAGE_TYPES.join(', ')}.`,
    );
  }
  if (bytes.length === 0) throw ApiError.badRequest('The uploaded file is empty.');
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw ApiError.badRequest(
      `That image is ${(bytes.length / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const token = await getStorageToken();
  const base = env.SUPABASE_URL.replace(/\/$/, '');

  // A random name means two uploads of "gorilla.jpg" never collide.
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensionFor(contentType)}`;
  const path = `${CMS_PREFIX}/${name}`;

  const res = await fetch(
    `${base}/storage/v1/object/${TOUR_IMAGE_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(bytes),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw ApiError.internal(`The image store rejected the upload (${res.status}). ${body.slice(0, 160)}`);
  }

  return { path, url: publicUrlFor(path) };
}

/**
 * Delete a file from the CMS folder.
 *
 * Never throws for a file that is already gone — the caller is usually
 * cleaning up after a database row was deleted, and "already deleted" is the
 * desired end state.
 */
export async function deleteImageFile(path: string): Promise<void> {
  // Only ever delete inside our own folder. This is the API's own belt to
  // the storage policy's braces: a crafted path must not reach the rest of
  // the bucket.
  if (!path.startsWith(`${CMS_PREFIX}/`)) return;

  try {
    const token = await getStorageToken();
    const base = env.SUPABASE_URL.replace(/\/$/, '');
    await fetch(`${base}/storage/v1/object/${TOUR_IMAGE_BUCKET}/${path}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // A failed cleanup must not fail the request that triggered it — the
    // database row is already gone, so the file is an orphan at worst.
  }
}

/**
 * True when a URL points at a file this app uploaded.
 * Used to decide whether deleting an image row should also delete the file.
 */
export function isCmsUpload(url: string): boolean {
  const marker = `/${TOUR_IMAGE_BUCKET}/${CMS_PREFIX}/`;
  return url.includes(marker);
}

/**
 * The storage path of an uploaded file, given its public URL.
 *
 * The returned path KEEPS the `cms/` prefix — that is the path inside the
 * bucket, and `deleteImageFile` refuses anything outside it.
 */
export function pathFromUrl(url: string): string | null {
  const marker = `/${TOUR_IMAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  return url.slice(at + marker.length);
}

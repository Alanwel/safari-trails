/**
 * Gallery manager for a tour.
 *
 * ---------------------------------------------------------------------------
 * How an image gets into the system
 * ---------------------------------------------------------------------------
 * Two routes, because there are two real situations:
 *
 *   1. UPLOAD  — a photo file on this laptop. The browser posts the raw
 *      bytes to the API, the API pushes them into Supabase Storage, and the
 *      API writes the row. The browser never talks to Supabase directly, so
 *      it never needs a storage key.
 *
 *   2. ADD BY URL — a photo that is already online (a Wikimedia Commons
 *      file, say). There is nothing to upload, only a URL to record.
 *
 * Both end with the same thing: a row in `tour_images` with a public URL.
 */
import { useRef, useState } from 'react';

import { ApiClientError, apiUrl, request } from '../api/client';
import type { TourImage } from '../api/types';
import { Icon } from '../components/Icon';

type Props = {
  token: string;
  tourId: number;
  images: TourImage[];
  coverImage: string | null;
  /** Called after anything changes so the parent can refetch. */
  onChanged: () => void;
};

export function ImageManager({ token, tourId, images, coverImage, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [url, setUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const auth = { Authorization: `Bearer ${token}` };

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof ApiClientError ? err.message : fallback);
  };

  /** Upload a file straight to the API as raw bytes. */
  const uploadFile = async (file: File) => {
    setBusy('upload');
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/tours/${tourId}/images/upload?alt=${encodeURIComponent(alt || file.name)}`),
        {
          method: 'POST',
          headers: { ...auth, 'Content-Type': file.type },
          body: file,
        },
      );

      if (!res.ok) {
        // The API answers with the same JSON envelope on failure.
        let message = `The upload failed (${res.status}).`;
        try {
          const payload = await res.json();
          if (payload?.error?.message) message = payload.error.message;
        } catch {
          /* keep the default message */
        }
        throw new ApiClientError(message, 'UPLOAD_FAILED', res.status);
      }

      setAlt('');
      if (fileInput.current) fileInput.current.value = '';
      onChanged();
    } catch (err) {
      fail(err, 'The upload failed. Check the file size and try again.');
    } finally {
      setBusy(null);
    }
  };

  const addByUrl = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    setBusy('url');
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}/images`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ url: url.trim(), alt: alt.trim() || 'Tour photo' }),
      });
      setUrl('');
      setAlt('');
      onChanged();
    } catch (err) {
      fail(err, 'Could not add that image.');
    } finally {
      setBusy(null);
    }
  };

  const setCover = async (image: TourImage) => {
    setBusy(`cover-${image.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ coverImage: image.url }),
      });
      onChanged();
    } catch (err) {
      fail(err, 'Could not set the cover image.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (image: TourImage) => {
    if (!window.confirm('Remove this image from the gallery?')) return;
    setBusy(`del-${image.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}/images/${image.id}`, {
        method: 'DELETE',
        headers: auth,
      });
      // If the removed image was the cover, clear it so the card is not left
      // pointing at a picture that is no longer in the gallery.
      if (coverImage === image.url) {
        await request(`/api/admin/tours/${tourId}`, {
          method: 'PATCH',
          headers: auth,
          body: JSON.stringify({ coverImage: null }),
        });
      }
      onChanged();
    } catch (err) {
      fail(err, 'Could not remove that image.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-forest-900">
            Gallery
          </h3>
          <p className="mt-0.5 text-sm text-forest-700/60">
            {images.length} {images.length === 1 ? 'image' : 'images'} · the first one is
            used as the cover on the listing card.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
          <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => {
            const isCover = coverImage === image.url;
            return (
              <figure
                key={image.id}
                className={`overflow-hidden rounded-xl border bg-sand-50 ${
                  isCover ? 'border-forest-600 ring-2 ring-forest-600/25' : 'border-sand-200'
                }`}
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  loading="lazy"
                  className="h-32 w-full object-cover"
                />
                <figcaption className="space-y-2 p-2.5">
                  {isCover && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                      <Icon name="check" className="h-3.5 w-3.5" />
                      Cover
                    </span>
                  )}
                  <p className="truncate text-xs text-forest-700/60" title={image.alt}>
                    {image.alt}
                  </p>
                  <div className="flex gap-1.5">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => setCover(image)}
                        disabled={busy !== null}
                        className="btn btn-ghost flex-1 px-2 py-1 text-xs"
                      >
                        Make cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(image)}
                      disabled={busy !== null}
                      className="btn btn-ghost px-2 py-1 text-xs text-clay-600"
                      title="Remove image"
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {/* Upload a file ------------------------------------------------- */}
      <div className="mt-6 rounded-xl border border-dashed border-sand-300 bg-sand-50 p-4">
        <h4 className="text-sm font-semibold text-forest-900">Upload a photo</h4>
        <p className="mt-0.5 text-xs text-forest-700/60">
          JPEG, PNG or WebP · up to 3 MB. The file is stored in Supabase Storage and
          served from there.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="image-alt">
              Describe the image
            </label>
            <input
              id="image-alt"
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="field"
              placeholder="e.g. Gorilla family in the undergrowth"
            />
            <p className="mt-1 text-xs text-forest-700/55">
              This is what a screen reader says, and what Google shows. Keep it short and
              describe what is actually in the picture.
            </p>
          </div>

          <div className="flex items-end">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
              className="block w-full text-sm text-forest-700/70 file:mr-3 file:rounded-lg file:border-0 file:bg-forest-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sand-50 hover:file:bg-forest-800"
            />
          </div>
        </div>

        {busy === 'upload' && (
          <p className="mt-3 flex items-center gap-2 text-sm text-forest-700/70">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700" />
            Uploading…
          </p>
        )}
      </div>

      {/* Add by URL ----------------------------------------------------- */}
      <form onSubmit={addByUrl} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <div>
          <label className="field-label" htmlFor="image-url">
            Or add an image that is already online
          </label>
          <input
            id="image-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="field"
            placeholder="https://upload.wikimedia.org/…"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="image-url-alt">
            Alt text
          </label>
          <input
            id="image-url-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="field"
            placeholder="Short description"
          />
        </div>
        <button type="submit" disabled={busy !== null || !url.trim()} className="btn btn-primary">
          {busy === 'url' ? 'Adding…' : 'Add'}
        </button>
      </form>
    </div>
  );
}

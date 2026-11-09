/**
 * The Destinations tab — the places the tours belong to.
 *
 * A destination is simpler than a tour: no price, no itinerary, no gallery.
 * So the editor is a plain inline form rather than a separate page.
 */
import { useState } from 'react';

import { ApiClientError, request } from '../api/client';
import { useAdminApi } from './useAdminApi';
import type { AdminDestinationRow } from '../api/types';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Spinner } from '../components/States';

type Draft = {
  name: string;
  region: string;
  tagline: string;
  description: string;
  bestSeason: string;
  averageDays: string;
  coverImage: string;
  published: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  region: '',
  tagline: '',
  description: '',
  bestSeason: '',
  averageDays: '',
  coverImage: '',
  published: true,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export function DestinationsTab({ token }: { token: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const destinations = useAdminApi<AdminDestinationRow[]>('/api/admin/destinations');
  const auth = { Authorization: `Bearer ${token}` };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const startCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId('new');
    setError(null);
  };

  const startEdit = (destination: AdminDestinationRow) => {
    setDraft({
      name: destination.name,
      region: destination.region,
      tagline: destination.tagline,
      description: destination.description,
      bestSeason: destination.bestSeason ?? '',
      averageDays: destination.averageDays ? String(destination.averageDays) : '',
      coverImage: destination.coverImage ?? '',
      published: destination.published,
    });
    setEditingId(destination.id);
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('save');
    setError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        region: draft.region.trim(),
        tagline: draft.tagline.trim(),
        description: draft.description.trim(),
        bestSeason: draft.bestSeason.trim() || null,
        averageDays: draft.averageDays ? Number(draft.averageDays) : null,
        coverImage: draft.coverImage.trim() || null,
        published: draft.published,
      };

      if (editingId === 'new') {
        await request('/api/admin/destinations', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ ...payload, slug: slugify(draft.name) }),
        });
      } else if (typeof editingId === 'number') {
        await request(`/api/admin/destinations/${editingId}`, {
          method: 'PATCH',
          headers: auth,
          body: JSON.stringify(payload),
        });
      }

      setEditingId(null);
      destinations.refetch();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not save that destination.',
      );
    } finally {
      setBusy(null);
    }
  };

  const togglePublished = async (destination: AdminDestinationRow) => {
    setBusy(`pub-${destination.id}`);
    setError(null);
    try {
      await request(`/api/admin/destinations/${destination.id}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ published: !destination.published }),
      });
      destinations.refetch();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not change that destination.',
      );
    } finally {
      setBusy(null);
    }
  };

  const remove = async (destination: AdminDestinationRow) => {
    if (!window.confirm(`Delete "${destination.name}"?`)) return;
    setBusy(`del-${destination.id}`);
    setError(null);
    try {
      await request(`/api/admin/destinations/${destination.id}`, {
        method: 'DELETE',
        headers: auth,
      });
      destinations.refetch();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not delete that destination.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-forest-700/60">
          A destination is a place — Bwindi, Kibale, Lake Victoria. Tours live inside one.
        </p>
        <button type="button" onClick={startCreate} className="btn btn-primary">
          <Icon name="compass" className="h-4 w-4" />
          New destination
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
          <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {destinations.loading && (
        <div className="mt-6 flex items-center justify-center gap-3 py-20 text-sm text-forest-700/60">
          <Spinner className="h-5 w-5" />
          Loading destinations…
        </div>
      )}

      {destinations.error && (
        <div className="mt-6">
          <ErrorState message={destinations.error} onRetry={destinations.refetch} />
        </div>
      )}

      {!destinations.loading && !destinations.error && destinations.data?.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No destinations yet"
            message="Create one first — every tour has to belong to a destination."
          />
        </div>
      )}

      {destinations.data && destinations.data.length > 0 && (
        <div className="mt-6 space-y-3">
          {destinations.data.map((destination) => (
            <article
              key={destination.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-sand-200 bg-white p-4"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                {destination.coverImage ? (
                  <img
                    src={destination.coverImage}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-forest-700/30">
                    <Icon name="compass" className="h-6 w-6" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-forest-900">
                    {destination.name}
                  </h3>
                  {destination.published ? (
                    <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-ochre-100 px-2 py-0.5 text-xs font-semibold text-ochre-700">
                      Draft
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-forest-700/60">
                  {destination.region} · {destination.tourCount}{' '}
                  {destination.tourCount === 1 ? 'tour' : 'tours'}
                </p>
                <p className="mt-0.5 text-xs text-forest-700/45">
                  /destinations/{destination.slug}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void togglePublished(destination)}
                  disabled={busy !== null}
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  {destination.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(destination)}
                  className="btn btn-primary px-3 py-1.5 text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void remove(destination)}
                  disabled={busy !== null}
                  className="btn btn-ghost px-2 py-1.5 text-xs text-clay-600"
                  title="Delete destination"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Inline editor -------------------------------------------------- */}
      {editingId !== null && (
        <div className="mt-6 rounded-2xl border border-forest-600/30 bg-white p-6">
          <h3 className="font-display text-lg font-semibold text-forest-900">
            {editingId === 'new' ? 'New destination' : 'Edit destination'}
          </h3>

          <form onSubmit={save} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="dest-name">
                  Name
                </label>
                <input
                  id="dest-name"
                  type="text"
                  required
                  minLength={2}
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="field"
                  placeholder="e.g. Bwindi Impenetrable Forest"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="dest-region">
                  Region
                </label>
                <input
                  id="dest-region"
                  type="text"
                  required
                  minLength={2}
                  value={draft.region}
                  onChange={(e) => set('region', e.target.value)}
                  className="field"
                  placeholder="e.g. Western Uganda"
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="dest-tagline">
                Tagline
              </label>
              <input
                id="dest-tagline"
                type="text"
                required
                minLength={5}
                value={draft.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                className="field"
                placeholder="One line that sells the place"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="dest-description">
                Description
              </label>
              <textarea
                id="dest-description"
                required
                minLength={20}
                rows={6}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                className="field"
                placeholder="What the place is, what you do there, how to get there."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label" htmlFor="dest-season">
                  Best season
                </label>
                <input
                  id="dest-season"
                  type="text"
                  value={draft.bestSeason}
                  onChange={(e) => set('bestSeason', e.target.value)}
                  className="field"
                  placeholder="e.g. June to September"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="dest-days">
                  Typical stay (days)
                </label>
                <input
                  id="dest-days"
                  type="number"
                  min={1}
                  max={365}
                  value={draft.averageDays}
                  onChange={(e) => set('averageDays', e.target.value)}
                  className="field"
                  placeholder="4"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="dest-cover">
                  Cover image URL
                </label>
                <input
                  id="dest-cover"
                  type="text"
                  value={draft.coverImage}
                  onChange={(e) => set('coverImage', e.target.value)}
                  className="field"
                  placeholder="https://…"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => set('published', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-sand-300 text-forest-700 focus:ring-forest-600"
              />
              <span>
                <span className="block text-sm font-medium text-forest-900">Published</span>
                <span className="block text-xs text-forest-700/60">
                  A draft destination is hidden from the public site.
                </span>
              </span>
            </label>

            <div className="flex gap-2">
              <button type="submit" disabled={busy !== null} className="btn btn-primary">
                {busy === 'save' ? 'Saving…' : 'Save destination'}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

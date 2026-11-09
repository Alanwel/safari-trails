/**
 * The Tours tab — the CMS catalogue.
 *
 * Everything the operator can do to a tour from the list screen: open it,
 * publish it, unpublish it, delete it. Anything more detailed happens in the
 * editor.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiClientError, formatMoney, request } from '../api/client';
import { useAdminApi } from './useAdminApi';
import type { AdminTourRow } from '../api/types';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Spinner } from '../components/States';

export function ToursTab({ token }: { token: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const tours = useAdminApi<AdminTourRow[]>('/api/admin/tours');
  const auth = { Authorization: `Bearer ${token}` };

  const togglePublished = async (tour: AdminTourRow) => {
    setBusy(`pub-${tour.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tour.id}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ published: !tour.published }),
      });
      tours.refetch();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not change that tour.',
      );
    } finally {
      setBusy(null);
    }
  };

  const remove = async (tour: AdminTourRow) => {
    if (
      !window.confirm(
        `Delete "${tour.title}"? Its days and gallery images go with it. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(`del-${tour.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tour.id}`, { method: 'DELETE', headers: auth });
      tours.refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not delete that tour.');
    } finally {
      setBusy(null);
    }
  };

  const rows = (tours.data ?? []).filter((t) =>
    filter === 'all' ? true : filter === 'published' ? t.published : !t.published,
  );

  const drafts = (tours.data ?? []).filter((t) => !t.published).length;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(
            [
              ['all', `All ${tours.data?.length ?? 0}`],
              ['published', `Live ${(tours.data?.length ?? 0) - drafts}`],
              ['draft', `Drafts ${drafts}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-forest-700 text-sand-50'
                  : 'border border-sand-300 text-forest-700 hover:bg-sand-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Link to="/admin/tours/new" className="btn btn-primary">
          <Icon name="leaf" className="h-4 w-4" />
          New tour
        </Link>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
          <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tours.loading && (
        <div className="mt-6 flex items-center justify-center gap-3 py-20 text-sm text-forest-700/60">
          <Spinner className="h-5 w-5" />
          Loading tours…
        </div>
      )}

      {tours.error && (
        <div className="mt-6">
          <ErrorState message={tours.error} onRetry={tours.refetch} />
        </div>
      )}

      {!tours.loading && !tours.error && rows.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title={filter === 'all' ? 'No tours yet' : 'Nothing here'}
            message={
              filter === 'all'
                ? 'Create your first tour and it will show up on the public site.'
                : 'Try another filter.'
            }
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6 space-y-3">
          {rows.map((tour) => (
            <article
              key={tour.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-sand-200 bg-white p-4"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                {tour.coverImage ? (
                  <img
                    src={tour.coverImage}
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
                    {tour.title}
                  </h3>
                  {tour.published ? (
                    <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-ochre-100 px-2 py-0.5 text-xs font-semibold text-ochre-700">
                      Draft
                    </span>
                  )}
                  {tour.featured && (
                    <span className="rounded-full bg-sand-200 px-2 py-0.5 text-xs font-semibold text-forest-700/80">
                      Featured
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-forest-700/60">
                  {tour.destinationName} · {tour.durationDays} days ·{' '}
                  {formatMoney(tour.priceCents, tour.currency)} · {tour.dayCount} days
                  planned · {tour.imageCount} images
                </p>
                <p className="mt-0.5 text-xs text-forest-700/45">
                  /tours/{tour.slug} · last edited{' '}
                  {new Date(tour.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void togglePublished(tour)}
                  disabled={busy !== null}
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  {tour.published ? 'Unpublish' : 'Publish'}
                </button>
                <Link to={`/admin/tours/${tour.id}`} className="btn btn-primary px-3 py-1.5 text-xs">
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(tour)}
                  disabled={busy !== null}
                  className="btn btn-ghost px-2 py-1.5 text-xs text-clay-600"
                  title="Delete tour"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

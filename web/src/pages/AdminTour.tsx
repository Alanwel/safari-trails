/**
 * The tour editor — create a new tour or edit an existing one.
 *
 * ---------------------------------------------------------------------------
 * One page, two jobs
 * ---------------------------------------------------------------------------
 * `/admin/tours/new`  -> create
 * `/admin/tours/:id`  -> edit
 *
 * They share almost every line of code, so they share a component. The only
 * difference is whether the tour already has an id in the database, and
 * therefore whether it has days and images to manage.
 *
 * The rule that keeps this honest: **the form is the source of truth, and
 * Save is the only thing that writes it.** Nothing is saved as you type, so
 * a half-finished edit can never reach the public site. Draft and published
 * are the same thing with a different flag.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiClientError, formatMoney, request } from '../api/client';
import { useAdminApi } from '../admin/useAdminApi';
import type { AdminDestinationRow, AdminTourDetail } from '../api/types';
import { DayManager } from '../admin/DayManager';
import { ImageManager } from '../admin/ImageManager';
import { useAdminAuth } from '../admin/AdminAuth';
import { Icon } from '../components/Icon';
import { ErrorState, Spinner } from '../components/States';

type FormState = {
  title: string;
  slug: string;
  destinationId: string;
  summary: string;
  description: string;
  price: string;
  currency: string;
  durationDays: string;
  difficulty: string;
  groupSizeMax: string;
  featured: boolean;
  published: boolean;
  coverImage: string;
  highlights: string;
  included: string;
  excluded: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  destinationId: '',
  summary: '',
  description: '',
  price: '',
  currency: 'USD',
  durationDays: '7',
  difficulty: 'moderate',
  groupSizeMax: '8',
  featured: false,
  published: true,
  coverImage: '',
  highlights: '',
  included: '',
  excluded: '',
};

/** Currencies whose prices have no minor unit (no "cents" to speak of). */
const MINOR_UNITS: Record<string, number> = { UGX: 1, KES: 1, TZS: 1 };
const minorUnits = (currency: string) => MINOR_UNITS[currency] ?? 100;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const linesToArray = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const arrayToLines = (value: string[]) => value.join('\n');

export function AdminTour() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAdminAuth();

  const isNew = !id || id === 'new';
  const tourId = isNew ? null : Number(id);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);

  const destinations = useAdminApi<AdminDestinationRow[]>(
    token ? '/api/admin/destinations' : null,
  );

  const tour = useAdminApi<AdminTourDetail>(
    token && tourId ? `/api/admin/tours/${tourId}` : null,
  );

  // Fill the form from the server once the tour arrives.
  useEffect(() => {
    if (!tour.data || loaded) return;
    const t = tour.data;
    setForm({
      title: t.title,
      slug: t.slug,
      destinationId: String(t.destinationId),
      summary: t.summary,
      description: t.description,
      price: String(t.priceCents / minorUnits(t.currency)),
      currency: t.currency,
      durationDays: String(t.durationDays),
      difficulty: t.difficulty,
      groupSizeMax: String(t.groupSizeMax),
      featured: t.featured,
      published: t.published,
      coverImage: t.coverImage ?? '',
      highlights: arrayToLines(t.highlights),
      included: arrayToLines(t.included),
      excluded: arrayToLines(t.excluded),
    });
    setSlugTouched(true);
    setLoaded(true);
  }, [tour.data, loaded]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** Keep the slug in step with the title until the operator edits it. */
  const changeTitle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const destinationsForSelect = useMemo(
    () =>
      [...(destinations.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [destinations.data],
  );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);

    const factor = minorUnits(form.currency);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      destinationId: Number(form.destinationId),
      summary: form.summary.trim(),
      description: form.description.trim(),
      priceCents: Math.round(Number(form.price || '0') * factor),
      currency: form.currency,
      durationDays: Number(form.durationDays),
      difficulty: form.difficulty,
      groupSizeMax: Number(form.groupSizeMax),
      featured: form.featured,
      published: form.published,
      coverImage: form.coverImage.trim() || null,
      highlights: linesToArray(form.highlights),
      included: linesToArray(form.included),
      excluded: linesToArray(form.excluded),
    };

    try {
      if (tourId) {
        await request(`/api/admin/tours/${tourId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        setSaved('Saved.');
        tour.refetch();
      } else {
        const created = await request<AdminTourDetail>('/api/admin/tours', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        // Go to the edit URL so the days and images managers light up.
        navigate(`/admin/tours/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not save the tour. Nothing was changed.',
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTour = async () => {
    if (!tourId) return;
    if (
      !window.confirm(
        'Delete this tour? Its days and gallery images go with it, and any bookings pointing at it are kept for the record.',
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/admin?tab=tours');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not delete the tour.');
      setSaving(false);
    }
  };

  if (!tourId && !loaded) {
    return (
      <div className="container-page py-16">
        <Spinner className="mx-auto h-6 w-6 text-forest-700" />
      </div>
    );
  }

  if (tourId && tour.loading) {
    return (
      <div className="container-page py-16">
        <Spinner className="mx-auto h-6 w-6 text-forest-700" />
      </div>
    );
  }

  if (tourId && tour.error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={tour.error} onRetry={tour.refetch} />
      </div>
    );
  }

  const detail = tour.data;

  return (
    <div className="container-page py-12 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin?tab=tours')}
            className="btn btn-ghost -ml-4 mb-2"
          >
            ← Back to tours
          </button>
          <p className="eyebrow">{isNew ? 'New tour' : 'Editing tour'}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {isNew ? 'Create a tour' : form.title || 'Edit tour'}
          </h1>
          {!isNew && detail && (
            <p className="mt-1 text-sm text-forest-700/60">
              {detail.days.length} days · {detail.images.length} images ·{' '}
              {detail.bookingCount ?? 0} bookings · last edited{' '}
              {new Date(detail.updatedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!isNew && (
            <button type="button" onClick={deleteTour} disabled={saving} className="btn btn-ghost text-clay-600">
              Delete
            </button>
          )}
          <a
            href={detail ? `/tours/${detail.slug}` : '#'}
            target="_blank"
            rel="noreferrer"
            className={`btn btn-ghost ${detail ? '' : 'pointer-events-none opacity-40'}`}
          >
            View on site
          </a>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
          <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-forest-100 px-4 py-3 text-sm text-forest-700">
          <Icon name="check" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{saved}</span>
        </div>
      )}

      <form onSubmit={save} className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main column ------------------------------------------------- */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-forest-900">The basics</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="field-label" htmlFor="tour-title">
                  Title
                </label>
                <input
                  id="tour-title"
                  type="text"
                  required
                  minLength={3}
                  value={form.title}
                  onChange={(e) => changeTitle(e.target.value)}
                  className="field"
                  placeholder="e.g. Gorilla Trekking in Bwindi"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="tour-slug">
                  URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="hidden shrink-0 text-sm text-forest-700/50 sm:inline">
                    /tours/
                  </span>
                  <input
                    id="tour-slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set('slug', slugify(e.target.value));
                    }}
                    className="field"
                    placeholder="gorilla-trekking-in-bwindi"
                  />
                </div>
                <p className="mt-1 text-xs text-forest-700/55">
                  This is the address people share. Lowercase letters, numbers and dashes.
                </p>
              </div>

              <div>
                <label className="field-label" htmlFor="tour-summary">
                  Short summary
                </label>
                <textarea
                  id="tour-summary"
                  required
                  minLength={10}
                  maxLength={400}
                  rows={2}
                  value={form.summary}
                  onChange={(e) => set('summary', e.target.value)}
                  className="field"
                  placeholder="One or two sentences that appear on the card."
                />
              </div>

              <div>
                <label className="field-label" htmlFor="tour-description">
                  Full description
                </label>
                <textarea
                  id="tour-description"
                  required
                  minLength={20}
                  rows={8}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="field"
                  placeholder="What the trip is actually like."
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-forest-900">
              What is included
            </h2>
            <p className="mt-0.5 text-sm text-forest-700/60">One item per line.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['highlights', 'Highlights', 'Big selling points'],
                  ['included', 'Included', 'What the price covers'],
                  ['excluded', 'Not included', 'What costs extra'],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key}>
                  <label className="field-label" htmlFor={`tour-${key}`}>
                    {label}
                  </label>
                  <textarea
                    id={`tour-${key}`}
                    rows={5}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="field"
                    placeholder={hint}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Side column ------------------------------------------------- */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-forest-900">Details</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="field-label" htmlFor="tour-destination">
                  Destination
                </label>
                <select
                  id="tour-destination"
                  required
                  value={form.destinationId}
                  onChange={(e) => set('destinationId', e.target.value)}
                  className="field"
                >
                  <option value="">Choose a destination…</option>
                  {destinationsForSelect.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.region}
                      {d.published ? '' : ' (draft)'}
                    </option>
                  ))}
                </select>
                {destinations.error && (
                  <p className="mt-1 text-xs text-clay-600">{destinations.error}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="tour-price">
                    Price ({form.currency})
                  </label>
                  <input
                    id="tour-price"
                    type="number"
                    min={0}
                    step={minorUnits(form.currency) === 1 ? 1 : 0.01}
                    required
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    className="field"
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="tour-currency">
                    Currency
                  </label>
                  <select
                    id="tour-currency"
                    value={form.currency}
                    onChange={(e) => set('currency', e.target.value)}
                    className="field"
                  >
                    <option value="USD">USD</option>
                    <option value="UGX">UGX</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="KES">KES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="tour-duration">
                    Days
                  </label>
                  <input
                    id="tour-duration"
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={form.durationDays}
                    onChange={(e) => set('durationDays', e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="tour-group">
                    Max group
                  </label>
                  <input
                    id="tour-group"
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={form.groupSizeMax}
                    onChange={(e) => set('groupSizeMax', e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="tour-difficulty">
                  Difficulty
                </label>
                <select
                  id="tour-difficulty"
                  value={form.difficulty}
                  onChange={(e) => set('difficulty', e.target.value)}
                  className="field"
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="tour-cover">
                  Cover image URL
                </label>
                <input
                  id="tour-cover"
                  type="text"
                  value={form.coverImage}
                  onChange={(e) => set('coverImage', e.target.value)}
                  className="field"
                  placeholder="Paste a URL, or pick one from the gallery below"
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-forest-900">
              Visibility
            </h2>

            <div className="mt-4 space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => set('published', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-sand-300 text-forest-700 focus:ring-forest-600"
                />
                <span>
                  <span className="block text-sm font-medium text-forest-900">
                    Published
                  </span>
                  <span className="block text-xs text-forest-700/60">
                    Unpublished tours are a draft — invisible on the public site, fully
                    editable here.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-sand-300 text-forest-700 focus:ring-forest-600"
                />
                <span>
                  <span className="block text-sm font-medium text-forest-900">Featured</span>
                  <span className="block text-xs text-forest-700/60">
                    Featured tours are pushed to the top of the list.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            {saving ? 'Saving…' : tourId ? 'Save changes' : 'Create tour'}
          </button>

          {form.price && (
            <p className="text-center text-xs text-forest-700/55">
              Shown on the site as {formatMoney(Math.round(Number(form.price) * minorUnits(form.currency)), form.currency)}
            </p>
          )}
        </div>
      </form>

      {/*
        The itinerary and the gallery are OUTSIDE the tour form on purpose.
        Each of them has its own <form> of its own, and a <form> inside a
        <form> is invalid HTML: the browser ends up running the OUTER form's
        submission, which reloads the page and throws away every unsaved
        change. Two sibling forms are fine; a nested one is a trap.
      */}
      {tourId && detail && (
        <div className="mt-6 space-y-6">
          <DayManager
            token={token ?? ''}
            tourId={tourId}
            days={detail.days}
            onChanged={tour.refetch}
          />
          <ImageManager
            token={token ?? ''}
            tourId={tourId}
            images={detail.images}
            coverImage={detail.coverImage}
            onChanged={tour.refetch}
          />
        </div>
      )}
    </div>
  );
}

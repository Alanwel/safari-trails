import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApi } from '../api/hooks';
import { toQuery } from '../api/client';
import type { TourMeta, TourSummary } from '../api/types';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, SectionHeading } from '../components/States';
import { TourCard, TourCardSkeleton } from '../components/TourCard';

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'duration_asc', label: 'Shortest first' },
  { value: 'duration_desc', label: 'Longest first' },
];

const PRICE_BANDS = [
  { value: '', label: 'Any price' },
  { value: '50000', label: 'Under $500' },
  { value: '100000', label: 'Under $1,000' },
  { value: '150000', label: 'Under $1,500' },
  { value: '250000', label: 'Under $2,500' },
];

const DURATION_BANDS = [
  { value: '', label: 'Any length' },
  { value: '1-2', label: '1–2 days' },
  { value: '3-5', label: '3–5 days' },
  { value: '6-', label: '6+ days' },
];

export function Tours() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'recommended';
  const page = Number(params.get('page') ?? 1);

  const selectedDestinations = useMemo(
    () => params.get('destination')?.split(',').filter(Boolean) ?? [],
    [params],
  );
  const selectedDifficulties = useMemo(
    () => params.get('difficulty')?.split(',').filter(Boolean) ?? [],
    [params],
  );
  const maxPrice = params.get('maxPrice') ?? '';
  const duration = params.get('duration') ?? '';

  const query = toQuery({
    q: params.get('q') ?? undefined,
    destination: selectedDestinations.join(',') || undefined,
    difficulty: selectedDifficulties.join(',') || undefined,
    maxPrice: maxPrice || undefined,
    minDays: duration === '1-2' ? 1 : duration === '3-5' ? 3 : duration === '6-' ? 6 : undefined,
    maxDays: duration === '1-2' ? 2 : duration === '3-5' ? 5 : undefined,
    sort,
    page,
    pageSize: 9,
  });

  const tours = useApi<TourSummary[]>(`/api/tours${query}`);
  const meta = useApi<TourMeta>('/api/tours/meta');

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.delete('page'); // any filter change resets pagination
    setParams(next, { replace: true });
  };

  const toggleInList = (key: string, value: string) => {
    const current = params.get(key)?.split(',').filter(Boolean) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setParam(key, next.join(',') || undefined);
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const activeFilterCount =
    selectedDestinations.length +
    selectedDifficulties.length +
    (maxPrice ? 1 : 0) +
    (duration ? 1 : 0) +
    (q ? 1 : 0);

  return (
    <div className="container-page py-12 md:py-16">
      <SectionHeading
        eyebrow="The catalogue"
        title="Every trip we run"
        lede="Filter by where you want to go, how long you have, and how hard you want it to be."
      />

      <div className="mt-10 flex gap-10">
        {/* --------------------------------------------------------------- */}
        {/* Filters                                                          */}
        {/* --------------------------------------------------------------- */}
        <aside
          className={`${
            filtersOpen ? 'block' : 'hidden'
          } fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-sand-50 p-6 lg:static lg:block lg:w-64 lg:shrink-0 lg:overflow-visible lg:p-0`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <p className="font-display text-xl font-semibold">Filters</p>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-300"
              aria-label="Close filters"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-8 lg:mt-0">
            <div>
              <label className="field-label" htmlFor="filter-q">
                Search
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-700/40"
                />
                <input
                  id="filter-q"
                  className="field !pl-9"
                  defaultValue={q}
                  onChange={(e) => setParam('q', e.target.value || undefined)}
                  placeholder="Gorilla, rafting, Bunyonyi…"
                />
              </div>
            </div>

            <div>
              <p className="field-label">Destination</p>
              <div className="space-y-2">
                {meta.data?.destinations.map((d) => (
                  <label key={d.slug} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.includes(d.slug)}
                      onChange={() => toggleInList('destination', d.slug)}
                      className="h-4 w-4 rounded border-sand-300 text-forest-600 focus:ring-forest-400"
                    />
                    <span className="flex-1 text-forest-800">{d.name}</span>
                    <span className="text-xs text-forest-700/45">{d.tourCount}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="field-label">Difficulty</p>
              <div className="space-y-2">
                {['easy', 'moderate', 'challenging'].map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDifficulties.includes(level)}
                      onChange={() => toggleInList('difficulty', level)}
                      className="h-4 w-4 rounded border-sand-300 text-forest-600 focus:ring-forest-400"
                    />
                    <span className="flex-1 capitalize text-forest-800">{level}</span>
                    <span className="text-xs text-forest-700/45">
                      {meta.data?.difficultyCounts[level] ?? 0}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="filter-price">
                Max price
              </label>
              <select
                id="filter-price"
                className="field"
                value={maxPrice}
                onChange={(e) => setParam('maxPrice', e.target.value || undefined)}
              >
                {PRICE_BANDS.map((band) => (
                  <option key={band.value} value={band.value}>
                    {band.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="filter-duration">
                Trip length
              </label>
              <select
                id="filter-duration"
                className="field"
                value={duration}
                onChange={(e) => setParam('duration', e.target.value || undefined)}
              >
                {DURATION_BANDS.map((band) => (
                  <option key={band.value} value={band.value}>
                    {band.label}
                  </option>
                ))}
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button type="button" onClick={clearAll} className="btn btn-ghost w-full">
                Clear all filters
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="btn btn-primary mt-6 w-full lg:hidden"
          >
            Show results
          </button>
        </aside>

        {/* --------------------------------------------------------------- */}
        {/* Results                                                          */}
        {/* --------------------------------------------------------------- */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="btn btn-ghost lg:hidden"
            >
              <Icon name="filter" className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-700 px-1.5 text-[0.6875rem] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <p className="text-sm text-forest-700/65">
              {tours.loading ? (
                'Loading trips…'
              ) : (
                <>
                  <strong className="font-semibold text-forest-900">
                    {tours.data?.length ?? 0}
                  </strong>{' '}
                  {tours.data?.length === 1 ? 'trip' : 'trips'} found
                </>
              )}
            </p>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-forest-700/60">Sort</span>
              <select
                className="field !w-auto !py-1.5"
                value={sort}
                onChange={(e) => setParam('sort', e.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {selectedDestinations.map((slug) => (
                <FilterChip key={slug} onRemove={() => toggleInList('destination', slug)}>
                  {meta.data?.destinations.find((d) => d.slug === slug)?.name ?? slug}
                </FilterChip>
              ))}
              {selectedDifficulties.map((level) => (
                <FilterChip key={level} onRemove={() => toggleInList('difficulty', level)}>
                  {level}
                </FilterChip>
              ))}
              {maxPrice && (
                <FilterChip onRemove={() => setParam('maxPrice', undefined)}>
                  Under ${Number(maxPrice) / 100}
                </FilterChip>
              )}
              {duration && (
                <FilterChip onRemove={() => setParam('duration', undefined)}>
                  {DURATION_BANDS.find((b) => b.value === duration)?.label}
                </FilterChip>
              )}
              {q && <FilterChip onRemove={() => setParam('q', undefined)}>“{q}”</FilterChip>}
            </div>
          )}

          <div className="mt-8">
            {tours.loading && (
              <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <TourCardSkeleton key={i} />
                ))}
              </div>
            )}

            {tours.error && <ErrorState message={tours.error} onRetry={tours.refetch} />}

            {!tours.loading && !tours.error && tours.data?.length === 0 && (
              <EmptyState
                title="No trips match those filters"
                message="Try widening the price band or adding another destination."
                action={
                  <button type="button" onClick={clearAll} className="btn btn-ghost mt-2">
                    Clear filters
                  </button>
                }
              />
            )}

            {!tours.loading && !tours.error && (tours.data?.length ?? 0) > 0 && (
              <>
                <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                  {tours.data?.map((tour) => (
                    <TourCard key={tour.slug} tour={tour} />
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={(tours.meta?.totalPages as number) ?? 1}
                  onChange={(next) => {
                    const nextParams = new URLSearchParams(params);
                    nextParams.set('page', String(next));
                    setParams(nextParams, { replace: true });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const items: (number | 'gap')[] = [];
  pages.forEach((p, index) => {
    if (index > 0 && p - pages[index - 1] > 1) items.push('gap');
    items.push(p);
  });

  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-forest-700 transition-colors hover:bg-sand-100 disabled:opacity-35"
        aria-label="Previous page"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
      </button>

      {items.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-forest-700/40">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
              item === page
                ? 'bg-forest-700 text-sand-50'
                : 'border border-sand-300 text-forest-700 hover:bg-sand-100'
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-forest-700 transition-colors hover:bg-sand-100 disabled:opacity-35"
        aria-label="Next page"
      >
        <Icon name="arrow-right" className="h-4 w-4" />
      </button>
    </nav>
  );
}

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 py-1.5 pl-3 pr-2 text-xs font-medium capitalize text-forest-800">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-forest-200"
        aria-label={`Remove filter ${children}`}
      >
        <Icon name="close" className="h-3 w-3" />
      </button>
    </span>
  );
}

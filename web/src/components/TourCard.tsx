import { Link } from 'react-router-dom';

import { formatMoney } from '../api/client';
import type { TourSummary } from '../api/types';
import { Icon } from './Icon';
import { Rating } from './Rating';
import { SmartImage } from './SmartImage';

const difficultyLabel: Record<string, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
};

export function TourCard({ tour }: { tour: TourSummary }) {
  return (
    <Link
      to={`/tours/${tour.slug}`}
      className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-200">
        <SmartImage
          src={tour.coverImage}
          alt={tour.title}
          fallbackLabel={tour.destination.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-forest-950/70 to-transparent" />

        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-forest-800 backdrop-blur">
            {difficultyLabel[tour.difficulty] ?? tour.difficulty}
          </span>
          {tour.featured && (
            <span className="rounded-full bg-ochre-500 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
              Featured
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white">
          <Icon name="map-pin" className="h-3.5 w-3.5" />
          {tour.destination.name}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <Rating value={tour.rating} count={tour.reviewCount} />
          <span className="flex items-center gap-1.5 text-xs text-forest-700/65">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {tour.durationDays} {tour.durationDays === 1 ? 'day' : 'days'}
          </span>
        </div>

        <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-forest-900 transition-colors group-hover:text-forest-700">
          {tour.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-forest-700/70">
          {tour.summary}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-sand-200 pt-4">
          <div>
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-forest-700/50">
              From
            </span>
            <span className="font-display text-xl font-semibold text-forest-900">
              {formatMoney(tour.priceCents, tour.currency)}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-forest-700 transition-colors group-hover:text-ochre-600">
            View
            <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TourCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-5/6 rounded" />
        <div className="skeleton mt-4 h-6 w-28 rounded" />
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

import type { DestinationSummary } from '../api/types';
import { Icon } from './Icon';
import { SmartImage } from './SmartImage';

export function DestinationCard({
  destination,
}: {
  destination: DestinationSummary;
}) {
  return (
    <Link
      to={`/destinations/${destination.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-forest-900"
    >
      <SmartImage
        src={destination.coverImage}
        alt={destination.name}
        fallbackLabel={destination.name}
        className="h-80 w-full object-cover opacity-85 transition-all duration-500 group-hover:scale-105 group-hover:opacity-70"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ochre-300">
          <Icon name="map-pin" className="h-3.5 w-3.5" />
          {destination.region}
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-sand-50">
          {destination.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-sand-200/80">{destination.tagline}</p>

        <div className="mt-3 flex items-center justify-between text-xs font-medium text-sand-200/75">
          <span>
            {destination.tourCount} {destination.tourCount === 1 ? 'tour' : 'tours'}
          </span>
          <span className="flex items-center gap-1 text-ochre-300 transition-transform group-hover:translate-x-1">
            Explore
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

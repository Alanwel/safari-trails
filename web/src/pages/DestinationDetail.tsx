import { Link, useParams } from 'react-router-dom';

import { useApi } from '../api/hooks';
import { useSeo, SITE_URL } from '../seo/useSeo';
import type { Destination } from '../api/types';
import { Icon } from '../components/Icon';
import { Reveal } from '../components/Reveal';
import { ErrorState, SectionHeading, Spinner } from '../components/States';
import { SmartImage } from '../components/SmartImage';
import { TourCard } from '../components/TourCard';

export function DestinationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, refetch } = useApi<Destination>(
    slug ? `/api/destinations/${slug}` : null,
  );

  // Kept in its own component so the SEO hook always runs, even before the
  // destination has loaded.
  return (
    <>
      <DestinationSeo destination={data} slug={slug ?? ''} />
      <DestinationBody
        destination={data}
        loading={loading}
        error={error}
        refetch={refetch}
      />
    </>
  );
}

function DestinationSeo({
  destination,
  slug,
}: {
  destination: Destination | null;
  slug: string;
}) {
  useSeo({
    title: destination
      ? `${destination.name}, ${destination.region} — what to do there | Safari Trails`
      : 'Safari Trails',
    description: destination?.tagline ?? 'Uganda destinations, tours and travel guides.',
    path: `/destinations/${slug}`,
    image: destination?.coverImage ?? null,
    jsonLd: destination
      ? {
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: destination.name,
          description: destination.description,
          url: `${SITE_URL}/destinations/${destination.slug}`,
          image: destination.coverImage ?? undefined,
          address: {
            '@type': 'PostalAddress',
            addressRegion: destination.region,
            addressCountry: 'UG',
          },
        }
      : undefined,
  });
  return null;
}

function DestinationBody({
  destination,
  loading,
  error,
  refetch,
}: {
  destination: Destination | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}) {

  if (loading) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-forest-600" />
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error ?? 'That destination could not be found.'} onRetry={refetch} />
        <div className="mt-6 text-center">
          <Link to="/destinations" className="btn btn-ghost">
            Back to all destinations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-forest-950">
        <div className="absolute inset-0 -z-10">
          <SmartImage
            src={destination.coverImage}
            alt={destination.name}
            loading="eager"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/65 to-forest-950/35" />
        </div>

        <div className="container-page pb-14 pt-24 md:pb-20 md:pt-32">
          <nav className="mb-6 flex items-center gap-2 text-sm text-sand-200/70">
            <Link to="/destinations" className="transition-colors hover:text-sand-100">
              Destinations
            </Link>
            <span>/</span>
            <span className="text-sand-100">{destination.name}</span>
          </nav>

          <div className="max-w-3xl">
            <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ochre-300">
              <Icon name="map-pin" className="h-3.5 w-3.5" />
              {destination.region}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-sand-50 md:text-5xl">
              {destination.name}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-sand-200/85">{destination.tagline}</p>

            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm text-sand-200/80">
              <span className="flex items-center gap-2">
                <Icon name="compass" className="h-4 w-4 text-ochre-400" />
                {destination.tours.length} {destination.tours.length === 1 ? 'tour' : 'tours'}
              </span>
              {destination.bestSeason && (
                <span className="flex items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-ochre-400" />
                  Best season: {destination.bestSeason}
                </span>
              )}
              {destination.averageDays && (
                <span className="flex items-center gap-2">
                  <Icon name="clock" className="h-4 w-4 text-ochre-400" />
                  Typically {destination.averageDays} days
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h2 className="font-display text-2xl font-semibold">About {destination.name}</h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-forest-800/85">
            {destination.description}
          </p>

          {destination.highlights.length > 0 && (
            <>
              <h3 className="mt-10 font-display text-lg font-semibold">What makes it special</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {destination.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-2.5 rounded-xl bg-sand-100 px-4 py-3 text-sm text-forest-800"
                  >
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <h3 className="font-display text-sm font-semibold">Good to know</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-forest-700/50">Region</dt>
                <dd className="mt-0.5 font-medium text-forest-900">{destination.region}</dd>
              </div>
              {destination.bestSeason && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-forest-700/50">
                    Best season
                  </dt>
                  <dd className="mt-0.5 font-medium text-forest-900">{destination.bestSeason}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wider text-forest-700/50">
                  Average stay
                </dt>
                <dd className="mt-0.5 font-medium text-forest-900">
                  {destination.averageDays ?? '—'} days
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-sm font-semibold">Need advice?</h3>
            <p className="mt-2 text-sm text-forest-700/70">
              Not sure which trip suits you? Tell us your dates and we will suggest one.
            </p>
            <Link to="/contact" className="btn btn-primary mt-4 w-full">
              Talk to us
            </Link>
          </div>
        </aside>
      </div>

      {destination.tours.length > 0 && (
        <section className="container-page pb-8">
          <SectionHeading
            eyebrow={`Tours in ${destination.name}`}
            title="Trips from here"
          />
          <div className="mt-9 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {destination.tours.map((tour, index) => (
              <Reveal key={tour.slug} delay={index * 60}>
                <TourCard
                  tour={{
                    ...tour,
                    id: 0,
                    summary: '',
                    difficulty: tour.difficulty ?? 'moderate',
                    groupSizeMax: tour.groupSizeMax ?? 8,
                    rating: Number(tour.rating ?? 0),
                    reviewCount: tour.reviewCount ?? 0,
                    featured: tour.featured ?? false,
                    imageCredit: null,
                    highlights: [],
                    destination: {
                      id: 0,
                      slug: destination.slug,
                      name: destination.name,
                      region: destination.region,
                    },
                  }}
                />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { formatMoney } from '../api/client';
import { useApi } from '../api/hooks';
import type { TourDetail as TourDetailType } from '../api/types';
import { BookingModal } from '../components/BookingModal';
import { Icon } from '../components/Icon';
import { Rating } from '../components/Rating';
import { Reveal } from '../components/Reveal';
import { ErrorState, SectionHeading, Spinner } from '../components/States';
import { SmartImage } from '../components/SmartImage';
import { TourCard } from '../components/TourCard';

const difficultyCopy: Record<string, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
};

export function TourDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<number | null>(1);

  const { data: tour, loading, error, refetch } = useApi<TourDetailType>(
    slug ? `/api/tours/${slug}` : null,
  );

  if (loading) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-forest-600" />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error ?? 'That tour could not be found.'} onRetry={refetch} />
        <div className="mt-6 text-center">
          <Link to="/tours" className="btn btn-ghost">
            Back to all tours
          </Link>
        </div>
      </div>
    );
  }

  const gallery = [tour.coverImage, ...tour.images.map((i) => i.url)].filter(Boolean) as string[];

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-forest-950">
        <div className="absolute inset-0 -z-10">
          <SmartImage
            src={tour.coverImage}
            alt={tour.title}
            loading="eager"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/70 to-forest-950/40" />
        </div>

        <div className="container-page pb-14 pt-24 md:pb-20 md:pt-32">
          <nav className="mb-6 flex items-center gap-2 text-sm text-sand-200/70">
            <Link to="/tours" className="transition-colors hover:text-sand-100">
              Tours
            </Link>
            <span>/</span>
            <Link
              to={`/destinations/${tour.destination.slug}`}
              className="transition-colors hover:text-sand-100"
            >
              {tour.destination.name}
            </Link>
          </nav>

          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/95 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-forest-800">
                {difficultyCopy[tour.difficulty]}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-sand-100 backdrop-blur">
                {tour.durationDays} {tour.durationDays === 1 ? 'day' : 'days'}
              </span>
            </div>

            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-sand-50 md:text-5xl">
              {tour.title}
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand-200/85">
              {tour.summary}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Rating value={tour.rating} count={tour.reviewCount} size="md" />
              <span className="flex items-center gap-2 text-sm text-sand-200/80">
                <Icon name="map-pin" className="h-4 w-4 text-ochre-400" />
                {tour.destination.name}, {tour.destination.region}
              </span>
              <span className="flex items-center gap-2 text-sm text-sand-200/80">
                <Icon name="users" className="h-4 w-4 text-ochre-400" />
                Max {tour.groupSizeMax} travellers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-20">
        <div className="min-w-0">
          {/* Gallery */}
          {gallery.length > 1 && (
            <div className="mb-12 grid gap-3 sm:grid-cols-2">
              {gallery.slice(0, 4).map((image, index) => (
                <div
                  key={image + index}
                  className={`overflow-hidden rounded-2xl bg-sand-200 ${
                    index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                  }`}
                >
                  <SmartImage
                    src={image}
                    alt={`${tour.title} — photo ${index + 1}`}
                    fallbackLabel={tour.destination.name}
                    className={`h-full w-full object-cover ${
                      index === 0 ? 'aspect-[16/9]' : 'aspect-[16/10]'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Overview */}
          <section>
            <h2 className="font-display text-2xl font-semibold">About this trip</h2>
            <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-forest-800/85">
              {tour.description.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {tour.highlights.length > 0 && (
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {tour.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5 text-sm text-forest-800">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Itinerary */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold">Day by day</h2>
            <p className="mt-2 text-sm text-forest-700/60">
              {tour.durationDays} days, {tour.destination.region.toLowerCase()}.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
              {tour.days.map((day) => {
                const open = activeDay === day.dayNumber;
                return (
                  <div key={day.id} className="border-b border-sand-200 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setActiveDay(open ? null : day.dayNumber)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-sand-50"
                      aria-expanded={open}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-100 font-display text-sm font-semibold text-forest-800">
                        {day.dayNumber}
                      </span>
                      <span className="flex-1 font-display text-[1.0625rem] font-semibold text-forest-900">
                        {day.title}
                      </span>
                      <Icon
                        name="chevron-down"
                        className={`h-4.5 w-4.5 shrink-0 text-forest-700/50 transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {open && (
                      <div className="animate-fade-in px-5 pb-6 pl-[4.25rem]">
                        <p className="text-sm leading-relaxed text-forest-800/80">{day.description}</p>
                        {(day.accommodation || day.meals) && (
                          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs text-forest-700/65">
                            {day.accommodation && (
                              <span className="flex items-center gap-1.5">
                                <Icon name="compass" className="h-3.5 w-3.5" />
                                {day.accommodation}
                              </span>
                            )}
                            {day.meals && (
                              <span className="flex items-center gap-1.5">
                                <Icon name="check" className="h-3.5 w-3.5" />
                                {day.meals}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Included / excluded */}
          <section className="mt-14 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name="check" className="h-5 w-5 text-forest-500" />
                What&rsquo;s included
              </h3>
              <ul className="mt-4 space-y-2.5">
                {tour.included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-forest-800/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name="close" className="h-5 w-5 text-clay-500" />
                Not included
              </h3>
              <ul className="mt-4 space-y-2.5">
                {tour.excluded.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-forest-800/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Reviews */}
          {tour.reviews.length > 0 && (
            <section className="mt-14">
              <SectionHeading
                eyebrow="Reviews"
                title={`What travellers said (${tour.reviewCount})`}
              />
              <div className="mt-7 space-y-5">
                {tour.reviews.map((review) => (
                  <Reveal key={review.id}>
                    <article className="card p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-forest-900">{review.authorName}</p>
                          {review.authorCountry && (
                            <p className="text-xs text-forest-700/55">{review.authorCountry}</p>
                          )}
                        </div>
                        <Rating value={review.rating} />
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-forest-800/85">{review.comment}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Booking sidebar                                                   */}
        {/* ---------------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card p-6">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-forest-700/50">
              Per person
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-forest-900">
              {formatMoney(tour.priceCents, tour.currency)}
            </p>
            <p className="mt-1 text-xs text-forest-700/55">
              Based on 2 travellers · {tour.durationDays}{' '}
              {tour.durationDays === 1 ? 'day' : 'days'}
            </p>

            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="btn btn-accent mt-5 w-full"
            >
              Request to book
            </button>
            <a
              href={`mailto:hello@safaritrails.com?subject=${encodeURIComponent(
                `Enquiry: ${tour.title}`,
              )}`}
              className="btn btn-ghost mt-2.5 w-full"
            >
              <Icon name="mail" className="h-4 w-4" />
              Ask a question
            </a>

            <dl className="mt-6 space-y-3 border-t border-sand-200 pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-forest-700/60">
                  <Icon name="clock" className="h-4 w-4" />
                  Duration
                </dt>
                <dd className="font-medium text-forest-900">
                  {tour.durationDays} {tour.durationDays === 1 ? 'day' : 'days'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-forest-700/60">
                  <Icon name="gauge" className="h-4 w-4" />
                  Difficulty
                </dt>
                <dd className="font-medium text-forest-900">
                  {difficultyCopy[tour.difficulty]}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-forest-700/60">
                  <Icon name="users" className="h-4 w-4" />
                  Group size
                </dt>
                <dd className="font-medium text-forest-900">Max {tour.groupSizeMax}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-forest-700/60">
                  <Icon name="map-pin" className="h-4 w-4" />
                  Region
                </dt>
                <dd className="text-right font-medium text-forest-900">
                  {tour.destination.region}
                </dd>
              </div>
            </dl>
          </div>

          {tour.destination.bestSeason && (
            <div className="card mt-4 p-6">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                <Icon name="calendar" className="h-4 w-4 text-ochre-500" />
                Best time to go
              </h3>
              <p className="mt-2 text-sm text-forest-800/80">{tour.destination.bestSeason}</p>
            </div>
          )}
        </aside>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Related                                                            */}
      {/* ------------------------------------------------------------------ */}
      {tour.related.length > 0 && (
        <section className="container-page pb-4">
          <SectionHeading eyebrow="Also worth seeing" title="You might also like" />
          <div className="mt-9 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {tour.related.map((related) => (
              <TourCard
                key={related.slug}
                tour={{
                  id: 0,
                  slug: related.slug,
                  title: related.title,
                  summary: '',
                  priceCents: related.priceCents,
                  currency: related.currency,
                  durationDays: related.durationDays,
                  difficulty: 'moderate',
                  groupSizeMax: 8,
                  rating: related.rating,
                  reviewCount: related.reviewCount,
                  featured: false,
                  coverImage: related.coverImage,
                  imageCredit: null,
                  highlights: [],
                  destination: related.destination,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <BookingModal tour={tour} open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}

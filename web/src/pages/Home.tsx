import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApi } from '../api/hooks';
import type { DestinationSummary, TourSummary } from '../api/types';
import { useSeo, organizationJsonLd } from '../seo/useSeo';
import { Icon } from '../components/Icon';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/States';
import { SmartImage } from '../components/SmartImage';
import { TourCard, TourCardSkeleton } from '../components/TourCard';
import { site } from '../data/site';

const HERO_IMAGE = '/images/tours/mountain-gorilla-trekking-bwindi.jpg';

export function Home() {
  useSeo({
    title: 'Safari Trails — small-group gorilla trekking, Nile rafting & Rift Valley safaris in Uganda',
    description:
      'Small-group gorilla trekking, Nile rafting and Rift Valley safaris — planned by people who live here, and run by people who answer the phone. Browse Uganda tours and book directly.',
    path: '/',
    jsonLd: organizationJsonLd(),
  });

  const navigate = useNavigate();
  const [destination, setDestination] = useState('');

  const featured = useApi<TourSummary[]>('/api/tours?featured=true&pageSize=3&sort=recommended');
  const destinations = useApi<DestinationSummary[]>('/api/destinations');

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    navigate(`/tours?${params.toString()}`);
  };

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-forest-950">
        <div className="absolute inset-0 -z-10">
          <SmartImage
            src={HERO_IMAGE}
            alt="A mountain gorilla family in Bwindi Impenetrable Forest"
            loading="eager"
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/75 via-forest-950/55 to-forest-950/95" />
        </div>

        <div className="container-page relative py-24 md:py-36">
          <div className="max-w-3xl">
            <p className="eyebrow text-ochre-300">
              <span className="h-px w-8 bg-ochre-400" />
              Uganda · Rwanda · Kenya
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-sand-50 md:text-6xl lg:text-7xl">
              The wild, without the rush.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-200/85">
              Gorilla trekking, Nile rafting and Rift Valley safaris — run by guides who grew up
              in the parks, for groups of eight or fewer. No coaches. No schedules you did not
              choose.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/tours" className="btn btn-accent">
                Explore all tours
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="btn !border !border-sand-200/35 !text-sand-50 hover:!border-sand-200/70 hover:!bg-white/10"
              >
                Plan a private trip
              </Link>
            </div>
          </div>

          {/* Search widget */}
          <form
            onSubmit={submitSearch}
            className="mt-14 grid gap-3 rounded-2xl bg-white/95 p-3 shadow-lift backdrop-blur sm:grid-cols-[1fr_auto_auto_auto] sm:items-end sm:p-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-wider text-forest-700/60">
                Where to?
              </span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="field !border-0 !bg-sand-100 !py-2.5 focus:!shadow-none"
              >
                <option value="">Anywhere in Uganda</option>
                {destinations.data?.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="hidden sm:block">
              <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-wider text-forest-700/60">
                Style
              </span>
              <span className="flex h-[2.625rem] items-center gap-2 rounded-xl bg-sand-100 px-3.5 text-sm font-medium text-forest-800">
                <Icon name="compass" className="h-4 w-4 text-forest-500" />
                Guided
              </span>
            </div>

            <div className="hidden sm:block">
              <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-wider text-forest-700/60">
                Group
              </span>
              <span className="flex h-[2.625rem] items-center gap-2 rounded-xl bg-sand-100 px-3.5 text-sm font-medium text-forest-800">
                <Icon name="users" className="h-4 w-4 text-forest-500" />
                Max 8
              </span>
            </div>

            <button type="submit" className="btn btn-primary !py-2.5 sm:!px-6">
              <Icon name="search" className="h-4 w-4" />
              Find a tour
            </button>
          </form>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-sand-200 bg-sand-50">
        <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {site.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-semibold text-forest-800 md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-forest-700/65">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured tours                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="container-page py-20 md:py-28">
        <SectionHeading
          eyebrow="Where to start"
          title="Trips our travellers ask for twice"
          lede="The routes we run most often — and the ones people end up recommending to their friends."
          action={
            <Link to="/tours" className="btn btn-ghost shrink-0">
              All tours
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          }
        />

        <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {featured.loading &&
            Array.from({ length: 3 }, (_, i) => <TourCardSkeleton key={i} />)}
          {featured.data?.map((tour, i) => (
            <Reveal key={tour.slug} delay={i * 80}>
              <TourCard tour={tour} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pillars                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section id="about" className="bg-forest-900 py-20 text-sand-200 md:py-28">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow text-ochre-300">
              <span className="h-px w-8 bg-ochre-400" />
              How we work
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-sand-50 md:text-4xl">
              Four things we will not compromise on
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {site.pillars.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 70}>
                <div className="h-full rounded-2xl border border-forest-800 bg-forest-950/50 p-6 transition-colors hover:border-forest-700">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-800 text-ochre-300">
                    <Icon name={pillar.icon as 'group'} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-sand-50">
                    {pillar.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-sand-200/70">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Destinations                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="container-page py-20 md:py-28">
        <SectionHeading
          eyebrow="Where we go"
          title="Seven places worth the journey"
          lede="From gorilla forest to glacier, from river rapids to the islands of a lake with no crocodiles."
          action={
            <Link to="/destinations" className="btn btn-ghost shrink-0">
              All destinations
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          }
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.data?.slice(0, 6).map((destination, i) => (
            <Reveal key={destination.slug} delay={i * 60}>
              <div className="h-full">
                <DestinationTile destination={destination} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Testimonials                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-sand-100 py-20 md:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Guest books"
            title="What people say afterwards"
            align="center"
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {site.testimonials.map((testimonial, i) => (
              <Reveal key={testimonial.author} delay={i * 80}>
                <figure className="card flex h-full flex-col p-7">
                  <span className="font-display text-4xl leading-none text-ochre-300">“</span>
                  <blockquote className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-forest-800">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="mt-6 border-t border-sand-200 pt-4">
                    <p className="text-sm font-semibold text-forest-900">{testimonial.author}</p>
                    <p className="text-xs text-forest-700/60">
                      {testimonial.origin} · {testimonial.trip}
                    </p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="container-page py-20 md:py-28">
        <div className="relative isolate overflow-hidden rounded-3xl bg-forest-800 px-8 py-16 text-center md:px-16">
          <div className="absolute inset-0 -z-10 opacity-25">
            <SmartImage
              src="/images/tours/murchison-falls-nile-safari.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight text-sand-50 md:text-4xl">
            Tell us what you want to see. We will tell you honestly whether we can do it.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sand-200/80">
            Every enquiry gets a real reply from a real person — usually within a working day.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="btn btn-accent">
              Send an enquiry
            </Link>
            <a
              href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
              className="btn !border !border-sand-200/35 !text-sand-50 hover:!bg-white/10"
            >
              <Icon name="phone" className="h-4 w-4" />
              {site.contact.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/** Local copy of the destination tile so the home page can control layout. */
function DestinationTile({ destination }: { destination: DestinationSummary }) {
  return (
    <Link
      to={`/destinations/${destination.slug}`}
      className="group relative block h-full overflow-hidden rounded-2xl bg-forest-900"
    >
      <SmartImage
        src={destination.coverImage}
        alt={destination.name}
        fallbackLabel={destination.name}
        className="h-72 w-full object-cover opacity-85 transition-all duration-500 group-hover:scale-105 group-hover:opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ochre-300">
          {destination.region}
        </p>
        <h3 className="mt-1.5 font-display text-lg font-semibold text-sand-50">{destination.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-sand-200/75">{destination.tagline}</p>
      </div>
    </Link>
  );
}

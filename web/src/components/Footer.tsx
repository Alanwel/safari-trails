import { Link } from 'react-router-dom';

import { site } from '../data/site';
import { Icon } from './Icon';

export function Footer() {
  const year = new Date().getFullYear();
  const whatsappHref = `https://wa.me/${site.contact.whatsapp}`;

  return (
    <footer className="mt-24 bg-forest-900 text-sand-200">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sand-100">
              <Icon name="leaf" className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold text-sand-50">{site.brand}</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-sand-200/75">
            {site.description}
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-700 text-sand-200 transition-colors hover:border-ochre-500 hover:text-ochre-400"
              aria-label="WhatsApp"
            >
              <Icon name="message" className="h-4.5 w-4.5" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-700 text-sand-200 transition-colors hover:border-ochre-500 hover:text-ochre-400"
              aria-label="Instagram"
            >
              <Icon name="instagram" className="h-4.5 w-4.5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-700 text-sand-200 transition-colors hover:border-ochre-500 hover:text-ochre-400"
              aria-label="Facebook"
            >
              <Icon name="facebook" className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>

        <div className="md:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-100/60">
            Explore
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {site.nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sand-200/75 transition-colors hover:text-ochre-400">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/tours?sort=rating"
                className="text-sand-200/75 transition-colors hover:text-ochre-400"
              >
                Top rated tours
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-100/60">
            Destinations
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ['bwindi-impenetrable-forest', 'Bwindi Forest'],
              ['queen-elizabeth-national-park', 'Queen Elizabeth'],
              ['murchison-falls-national-park', 'Murchison Falls'],
              ['lake-bunyonyi', 'Lake Bunyonyi'],
              ['rwenzori-mountains', 'Rwenzori Mountains'],
            ].map(([slug, label]) => (
              <li key={slug}>
                <Link
                  to={`/destinations/${slug}`}
                  className="text-sand-200/75 transition-colors hover:text-ochre-400"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-100/60">
            Get in touch
          </h3>
          <ul className="mt-4 space-y-3.5 text-sm">
            <li className="flex items-start gap-2.5">
              <Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-ochre-400" />
              <span className="text-sand-200/75">{site.contact.address}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-ochre-400" />
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
                className="text-sand-200/75 transition-colors hover:text-ochre-400"
              >
                {site.contact.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-ochre-400" />
              <a
                href={`mailto:${site.contact.email}`}
                className="text-sand-200/75 transition-colors hover:text-ochre-400"
              >
                {site.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-ochre-400" />
              <span className="text-sand-200/75">{site.contact.hours}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-forest-800">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-sand-200/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.brand}. All rights reserved.
          </p>
          <p>
            Photography from{' '}
            <a
              href="https://commons.wikimedia.org"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-sand-200/30 underline-offset-2 transition-colors hover:text-ochre-400"
            >
              Wikimedia Commons
            </a>
            , used under Creative Commons licences.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Per-page SEO.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 * The site is a single-page app: every route ships the SAME index.html, so
 * every page had the same title, the same meta description, and no canonical
 * URL at all. To a search engine, that is ten pages competing with each
 * other over one title.
 *
 * Google does run JavaScript, so setting these on route change does work —
 * but a prerendered page is always better than a rendered one. This hook is
 * the cheapest correct fix, and it is the difference between "indexed
 * eventually" and "indexed properly".
 *
 * It also writes the JSON-LD structured data Google uses for rich results
 * (the star ratings and prices under a search result).
 */
import { useEffect } from 'react';

/** The real domain once it exists; the Vercel address until then. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://safari-trails-web.vercel.app'
).replace(/\/$/, '');

export type JsonLd = Record<string, unknown>;

export type Seo = {
  title: string;
  description: string;
  /** Path only, e.g. "/tours/gorilla-trekking". */
  path: string;
  /** Absolute or root-relative image URL. */
  image?: string | null;
  type?: 'website' | 'article';
  /** One object, or an array of objects. */
  jsonLd?: JsonLd | JsonLd[];
  /** Keep this page out of the index (used by /admin). */
  noindex?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Describe a page to a search engine.
 *
 * Call it at the top of every page component, with the values that belong
 * to THAT page. The effect re-runs whenever the page changes, so the tags
 * always describe what the visitor is actually looking at.
 */
export function useSeo({
  title,
  description,
  path,
  image,
  type = 'website',
  jsonLd,
  noindex = false,
}: Seo) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    const absoluteImage = image
      ? image.startsWith('http')
        ? image
        : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`
      : `${SITE_URL}/images/tours/mountain-gorilla-trekking-bwindi.jpg`;

    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertMeta('property', 'og:site_name', 'Safari Trails');
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', absoluteImage);
    upsertMeta('property', 'og:locale', 'en_GB');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', absoluteImage);

    upsertLink('canonical', url);

    // Structured data
    const existing = document.head.querySelector('script[data-seo-jsonld]');
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, image, type, jsonLdKey, noindex]);
}

/** The organisation block that appears on every page. */
export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'Safari Trails',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description:
      'Small-group gorilla trekking, Nile rafting and Rift Valley safaris — planned by people who live here, and run by people who answer the phone.',
    telephone: '+256730293345',
    email: 'hello@safaritrails.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Plot 7, Kampala Road',
      addressLocality: 'Kampala',
      addressCountry: 'UG',
    },
    areaServed: { '@type': 'Country', name: 'Uganda' },
  };
}

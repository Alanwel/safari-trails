/**
 * Build the sitemap from the live catalogue.
 *
 *   node scripts/generate-sitemap.mjs
 *
 * It runs as part of `npm run build`, so every deploy ships a sitemap that
 * matches the tours and destinations that actually exist. A sitemap that
 * lists dead URLs is worse than no sitemap at all.
 *
 * The site address comes from VITE_SITE_URL, with the API address as the
 * fallback — set VITE_SITE_URL to the real domain once you have it.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '..', 'public', 'sitemap.xml');

const SITE = (process.env.VITE_SITE_URL || 'https://safari-trails-web.vercel.app').replace(/\/$/, '');
const API = (process.env.VITE_API_URL || 'https://safari-trails-api.vercel.app').replace(/\/$/, '');

async function get(path) {
  try {
    const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    const json = await res.json();
    return json.data ?? [];
  } catch (err) {
    console.warn(`  ! ${path} failed: ${err.message}`);
    return [];
  }
}

const escape = (value) =>
  String(value).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

console.log(`[sitemap] reading the catalogue from ${API}`);
const [tours, destinations] = await Promise.all([
  get('/api/tours?pageSize=60'),
  get('/api/destinations'),
]);

// Newest first is not right for a sitemap — every URL is a "lastmod" hint,
// and a stable date is better than a wrong one.
const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/tours', priority: '0.9', changefreq: 'weekly' },
  { loc: '/destinations', priority: '0.9', changefreq: 'weekly' },
  { loc: '/about', priority: '0.5', changefreq: 'monthly' },
  { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
  { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
  ...destinations.map((d) => ({ loc: `/destinations/${d.slug}`, priority: '0.8', changefreq: 'weekly' })),
  ...tours.map((t) => ({ loc: `/tours/${t.slug}`, priority: '0.8', changefreq: 'weekly' })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escape(SITE + u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, xml, 'utf8');
console.log(`[sitemap] wrote ${urls.length} URLs -> ${outFile}`);

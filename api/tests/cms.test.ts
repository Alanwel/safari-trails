/**
 * CMS tests — the admin content API.
 *
 * These run against a real PGlite database with the real schema and the real
 * seed data, so they prove the whole path: HTTP -> validation -> SQL ->
 * database. No mocks.
 *
 * The theme running through them is the rule that matters most for a CMS:
 *
 *   a DRAFT must be visible to the admin and invisible to the public.
 *
 * If that ever breaks, "publish" stops meaning anything.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { closeDb, execSql, getDb } from '../src/db/client.js';
import { repoPath } from '../src/db/paths.js';
import { seed } from '../src/seed/seed.js';

const app = createApp();

let token = '';

async function admin() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@safaritrails.com', password: 'SafariTrails2026!' })
    .expect(200);
  return res.body.data.token as string;
}

/** A tour payload with sensible defaults, so each test only states what it cares about. */
function tourPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Safari',
    destinationId: 1,
    summary: 'A short summary for the card.',
    description: 'A longer description that passes the minimum length rule.',
    priceCents: 120000,
    currency: 'USD',
    durationDays: 7,
    difficulty: 'moderate',
    groupSizeMax: 8,
    ...overrides,
  };
}

beforeAll(async () => {
  await getDb();
  await execSql(readFileSync(repoPath('supabase', 'schema.sql'), 'utf8'));
  await seed();
  token = await admin();
});

afterAll(async () => {
  await closeDb();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('CMS — authentication', () => {
  it('refuses the tour list without a token', async () => {
    const res = await request(app).get('/api/admin/tours').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('refuses to create a tour without a token', async () => {
    await request(app)
      .post('/api/admin/tours')
      .send(tourPayload())
      .expect(401);
  });
});

describe('CMS — creating a tour', () => {
  it('creates a tour and derives a slug from the title', async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Kibale Night Walk' }))
      .expect(201);

    expect(res.body.data.slug).toBe('kibale-night-walk');
    expect(res.body.data.title).toBe('Kibale Night Walk');
    expect(res.body.data.published).toBe(true);
  });

  it('rejects a duplicate slug instead of silently overwriting', async () => {
    await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Duplicate Test' }))
      .expect(201);

    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Duplicate Test', slug: 'duplicate-test' }))
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects a tour with no title', async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: '' }))
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a destination that does not exist', async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ destinationId: 999999 }))
      .expect(400);
    expect(res.body.error.message).toMatch(/destination/i);
  });
});

describe('CMS — drafts are invisible to the public', () => {
  let draftId = 0;
  let draftSlug = '';

  it('creates a draft', async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Secret Draft Safari', published: false }))
      .expect(201);

    draftId = res.body.data.id;
    draftSlug = res.body.data.slug;
    expect(res.body.data.published).toBe(false);
  });

  it('hides the draft from the public catalogue', async () => {
    const list = await request(app).get('/api/tours?pageSize=60').expect(200);
    const found = list.body.data.find((t: any) => t.slug === draftSlug);
    expect(found).toBeUndefined();
  });

  it('hides the draft from the public detail page', async () => {
    await request(app).get(`/api/tours/${draftSlug}`).expect(404);
  });

  it('still shows the draft in the admin list', async () => {
    const res = await request(app).get('/api/admin/tours').set(auth()).expect(200);
    const found = res.body.data.find((t: any) => t.id === draftId);
    expect(found).toBeDefined();
    expect(found.published).toBe(false);
  });

  it('publishes the draft when asked', async () => {
    const res = await request(app)
      .patch(`/api/admin/tours/${draftId}`)
      .set(auth())
      .send({ published: true })
      .expect(200);
    expect(res.body.data.published).toBe(true);

    const list = await request(app).get('/api/tours?pageSize=60').expect(200);
    expect(list.body.data.find((t: any) => t.slug === draftSlug)).toBeDefined();
  });

  it('takes a real boolean, not the string "false"', async () => {
    const res = await request(app)
      .patch(`/api/admin/tours/${draftId}`)
      .set(auth())
      .send({ published: 'false' })
      .expect(200);
    expect(res.body.data.published).toBe(false);
  });
});

describe('CMS — editing a tour', () => {
  let id = 0;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Editable Safari' }))
      .expect(201);
    id = res.body.data.id;
  });

  it('updates the fields it was given', async () => {
    const res = await request(app)
      .patch(`/api/admin/tours/${id}`)
      .set(auth())
      .send({ title: 'Renamed Safari', priceCents: 250000, featured: true })
      .expect(200);

    expect(res.body.data.title).toBe('Renamed Safari');
    expect(res.body.data.priceCents).toBe(250000);
    expect(res.body.data.featured).toBe(true);
  });

  it('moves updated_at forward', async () => {
    const before = await request(app)
      .get(`/api/admin/tours/${id}`)
      .set(auth())
      .expect(200);
    const beforeTime = new Date(before.body.data.updatedAt).getTime();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await request(app)
      .patch(`/api/admin/tours/${id}`)
      .set(auth())
      .send({ summary: 'A brand new summary line for the card.' })
      .expect(200);

    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThan(beforeTime);
  });

  it('404s on an unknown id', async () => {
    await request(app)
      .patch('/api/admin/tours/999999')
      .set(auth())
      .send({ title: 'A perfectly valid title' })
      .expect(404);
  });
});

describe('CMS — itinerary days', () => {
  let tourId = 0;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Itinerary Safari' }))
      .expect(201);
    tourId = res.body.data.id;
  });

  it('adds a day', async () => {
    const res = await request(app)
      .post(`/api/admin/tours/${tourId}/days`)
      .set(auth())
      .send({ dayNumber: 1, title: 'Arrival', description: 'Meet the group at the airport.' })
      .expect(201);

    expect(res.body.data.dayNumber).toBe(1);
    expect(res.body.data.title).toBe('Arrival');
  });

  it('rejects a duplicate day number on the same tour', async () => {
    const res = await request(app)
      .post(`/api/admin/tours/${tourId}/days`)
      .set(auth())
      .send({ dayNumber: 1, title: 'Another day one', description: 'Should not be allowed.' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('edits a day', async () => {
    const list = await request(app)
      .get(`/api/admin/tours/${tourId}`)
      .set(auth())
      .expect(200);
    const dayId = list.body.data.days[0].id;

    const res = await request(app)
      .patch(`/api/admin/tours/${tourId}/days/${dayId}`)
      .set(auth())
      .send({ title: 'Arrival and settling in' })
      .expect(200);

    expect(res.body.data.title).toBe('Arrival and settling in');
  });

  it('deletes a day', async () => {
    const list = await request(app)
      .get(`/api/admin/tours/${tourId}`)
      .set(auth())
      .expect(200);
    const dayId = list.body.data.days[0].id;

    await request(app)
      .delete(`/api/admin/tours/${tourId}/days/${dayId}`)
      .set(auth())
      .expect(200);

    const after = await request(app)
      .get(`/api/admin/tours/${tourId}`)
      .set(auth())
      .expect(200);
    expect(after.body.data.days).toHaveLength(0);
  });
});

describe('CMS — gallery images', () => {
  let tourId = 0;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Gallery Safari' }))
      .expect(201);
    tourId = res.body.data.id;
  });

  it('attaches an image by URL', async () => {
    const res = await request(app)
      .post(`/api/admin/tours/${tourId}/images`)
      .set(auth())
      .send({ url: 'https://example.com/photo.jpg', alt: 'A gorilla in the trees' })
      .expect(201);

    expect(res.body.data.url).toBe('https://example.com/photo.jpg');
    expect(res.body.data.position).toBe(0);
  });

  it('requires alt text', async () => {
    const res = await request(app)
      .post(`/api/admin/tours/${tourId}/images`)
      .set(auth())
      .send({ url: 'https://example.com/photo2.jpg' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('removes an image', async () => {
    const list = await request(app)
      .get(`/api/admin/tours/${tourId}`)
      .set(auth())
      .expect(200);
    const imageId = list.body.data.images[0].id;

    await request(app)
      .delete(`/api/admin/tours/${tourId}/images/${imageId}`)
      .set(auth())
      .expect(200);

    const after = await request(app)
      .get(`/api/admin/tours/${tourId}`)
      .set(auth())
      .expect(200);
    expect(after.body.data.images).toHaveLength(0);
  });

  it('refuses a file upload when storage is not configured', async () => {
    // The test environment has no SUPABASE_* variables, so the upload route
    // must fail with a clear message rather than pretend it worked.
    const res = await request(app)
      .post(`/api/admin/tours/${tourId}/images/upload?alt=Photo`)
      .set(auth())
      .set('Content-Type', 'image/png')
      .send(Buffer.from('89504e470d0a1a0a', 'hex'))
      .expect(500);

    expect(res.body.error.message).toMatch(/not configured|upload/i);
  });
});

describe('CMS — destinations', () => {
  it('lists destinations with their tour counts', async () => {
    const res = await request(app).get('/api/admin/destinations').set(auth()).expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('tourCount');
  });

  it('creates a destination', async () => {
    const res = await request(app)
      .post('/api/admin/destinations')
      .set(auth())
      .send({
        name: 'Test Park',
        region: 'Western Uganda',
        tagline: 'A tagline for the test park.',
        description: 'A description long enough to satisfy the validation rule.',
      })
      .expect(201);

    expect(res.body.data.slug).toBe('test-park');
  });

  it('refuses to delete a destination that still has tours', async () => {
    const list = await request(app).get('/api/admin/destinations').set(auth()).expect(200);
    const withTours = list.body.data.find((d: any) => d.tourCount > 0);

    const res = await request(app)
      .delete(`/api/admin/destinations/${withTours.id}`)
      .set(auth())
      .expect(409);

    expect(res.body.error.message).toMatch(/tours/i);
  });

  it('deletes an empty destination', async () => {
    const list = await request(app).get('/api/admin/destinations').set(auth()).expect(200);
    const empty = list.body.data.find((d: any) => d.tourCount === 0);
    if (!empty) return; // nothing empty to test against

    await request(app).delete(`/api/admin/destinations/${empty.id}`).set(auth()).expect(200);
  });

  it('hides an unpublished destination from the public API', async () => {
    const created = await request(app)
      .post('/api/admin/destinations')
      .set(auth())
      .send({
        name: 'Hidden Reserve',
        region: 'Northern Uganda',
        tagline: 'A reserve that is not open yet.',
        description: 'A description long enough to satisfy the validation rule.',
        published: false,
      })
      .expect(201);

    const res = await request(app).get('/api/destinations').expect(200);
    expect(res.body.data.find((d: any) => d.slug === created.body.data.slug)).toBeUndefined();

    await request(app)
      .get(`/api/destinations/${created.body.data.slug}`)
      .expect(404);
  });
});

describe('CMS — deleting a tour', () => {
  it('removes the tour and its days', async () => {
    const created = await request(app)
      .post('/api/admin/tours')
      .set(auth())
      .send(tourPayload({ title: 'Doomed Safari' }))
      .expect(201);
    const id = created.body.data.id;

    await request(app)
      .post(`/api/admin/tours/${id}/days`)
      .set(auth())
      .send({ dayNumber: 1, title: 'Day one', description: 'Something happens on day one.' })
      .expect(201);

    await request(app).delete(`/api/admin/tours/${id}`).set(auth()).expect(200);

    const list = await request(app).get('/api/admin/tours').set(auth()).expect(200);
    expect(list.body.data.find((t: any) => t.id === id)).toBeUndefined();

    const publicList = await request(app).get('/api/tours?pageSize=60').expect(200);
    expect(publicList.body.data.find((t: any) => t.id === id)).toBeUndefined();
  });

  it('404s when deleting an unknown tour', async () => {
    await request(app).delete('/api/admin/tours/999999').set(auth()).expect(404);
  });
});

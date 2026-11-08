/**
 * End-to-end API tests.
 *
 * These run against a real Postgres (the in-memory PGlite build), with the
 * real schema and the real seed data — not a mock. If a route breaks, or the
 * schema drifts from what the queries expect, these fail.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { closeDb, execSql, getDb } from '../src/db/client.js';
import { repoPath } from '../src/db/paths.js';
import { seed } from '../src/seed/seed.js';

const app = createApp();

beforeAll(async () => {
  await getDb();
  await execSql(readFileSync(repoPath('supabase', 'schema.sql'), 'utf8'));
  await seed();
});

afterAll(async () => {
  await closeDb();
});

describe('GET /api/health', () => {
  it('reports the database it is talking to', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toContain('pglite');
  });
});

describe('GET /api/tours', () => {
  it('returns the seeded catalogue with pagination meta', async () => {
    const res = await request(app).get('/api/tours').expect(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toHaveLength(10);
    expect(res.body.meta.total).toBe(10);
    expect(res.body.meta.page).toBe(1);
  });

  it('returns rating as a number, not a string', async () => {
    const res = await request(app).get('/api/tours').expect(200);
    expect(typeof res.body.data[0].rating).toBe('number');
  });

  it('filters by destination', async () => {
    const res = await request(app)
      .get('/api/tours?destination=bwindi-impenetrable-forest')
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((t: any) => t.destination.slug === 'bwindi-impenetrable-forest')).toBe(
      true,
    );
  });

  it('filters by difficulty', async () => {
    const res = await request(app).get('/api/tours?difficulty=easy').expect(200);
    expect(res.body.data.every((t: any) => t.difficulty === 'easy')).toBe(true);
  });

  it('filters by price ceiling', async () => {
    const res = await request(app).get('/api/tours?maxPrice=10000').expect(200);
    expect(res.body.data.every((t: any) => t.priceCents <= 10000)).toBe(true);
  });

  it('searches title and summary', async () => {
    const res = await request(app).get('/api/tours?q=gorilla').expect(200);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('sorts by price ascending', async () => {
    const res = await request(app).get('/api/tours?sort=price_asc').expect(200);
    const prices = res.body.data.map((t: any) => t.priceCents);
    expect([...prices].sort((a: number, b: number) => a - b)).toEqual(prices);
  });

  it('rejects an unknown destination with 400', async () => {
    const res = await request(app).get('/api/tours?destination=atlantis').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/tours/meta', () => {
  it('returns filter facets', async () => {
    const res = await request(app).get('/api/tours/meta').expect(200);
    expect(res.body.data.destinations).toHaveLength(7);
    expect(res.body.data.priceRange.min).toBeGreaterThan(0);
    expect(res.body.data.difficultyCounts.easy).toBeGreaterThan(0);
  });
});

describe('GET /api/tours/:slug', () => {
  it('returns the tour with itinerary, images and reviews', async () => {
    const res = await request(app)
      .get('/api/tours/mountain-gorilla-trekking-bwindi')
      .expect(200);
    expect(res.body.data.title).toContain('Mountain Gorilla');
    expect(res.body.data.days.length).toBe(3);
    expect(res.body.data.days[0].dayNumber).toBe(1);
    expect(res.body.data.reviews.length).toBeGreaterThan(0);
    expect(res.body.data.destination.slug).toBe('bwindi-impenetrable-forest');
  });

  it('returns related tours with a real rating', async () => {
    const res = await request(app)
      .get('/api/tours/mountain-gorilla-trekking-bwindi')
      .expect(200);
    for (const related of res.body.data.related) {
      expect(typeof related.rating).toBe('number');
    }
  });

  it('404s for an unknown slug', async () => {
    const res = await request(app).get('/api/tours/no-such-tour').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/destinations', () => {
  it('lists destinations with tour counts', async () => {
    const res = await request(app).get('/api/destinations').expect(200);
    expect(res.body.data).toHaveLength(7);
    const bwindi = res.body.data.find((d: any) => d.slug === 'bwindi-impenetrable-forest');
    expect(bwindi.tourCount).toBe(2);
  });
});

describe('POST /api/bookings', () => {
  const valid = {
    tourSlug: 'mountain-gorilla-trekking-bwindi',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    travellers: 2,
    startDate: '2030-06-01',
  };

  it('creates a booking and returns a reference', async () => {
    const res = await request(app).post('/api/bookings').send(valid).expect(201);
    expect(res.body.data.reference).toMatch(/^ST-[A-Z0-9]{6}$/);
    expect(res.body.data.totalCents).toBe(190000);
    expect(res.body.data.status).toBe('pending');
  });

  it('rejects an invalid email with field-level detail', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...valid, customerEmail: 'nope' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: any) => d.field === 'customerEmail')).toBe(true);
  });

  it('rejects more travellers than the tour allows', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...valid, travellers: 40 })
      .expect(400);
    expect(res.body.error.message).toMatch(/at most/i);
  });

  it('rejects a start date in the past', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...valid, startDate: '2000-01-01' })
      .expect(400);
    expect(res.body.error.message).toMatch(/future/i);
  });

  it('404s for an unknown tour', async () => {
    await request(app)
      .post('/api/bookings')
      .send({ ...valid, tourSlug: 'nope' })
      .expect(404);
  });

  it('never trusts a client-supplied price', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...valid, totalCents: 1, priceCents: 1 })
      .expect(201);
    expect(res.body.data.totalCents).toBe(190000);
  });
});

describe('POST /api/inquiries', () => {
  it('accepts a message', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'July trip',
        message: 'We are four people. Is July a good time to go?',
      })
      .expect(201);
    expect(res.body.data.received).toBe(true);
  });
});

describe('admin authentication', () => {
  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/admin/bookings').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@safaritrails.com', password: 'wrong' })
      .expect(401);
  });

  it('does not reveal whether an email exists', async () => {
    const missing = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' })
      .expect(401);
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@safaritrails.com', password: 'whatever' })
      .expect(401);
    expect(missing.body.error.message).toBe(wrong.body.error.message);
  });

  it('issues a token for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@safaritrails.com', password: 'SafariTrails2026!' })
      .expect(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.admin.email).toBe('admin@safaritrails.com');
  });

  it('lists and updates bookings with a valid token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@safaritrails.com', password: 'SafariTrails2026!' });
    const token = login.body.data.token;

    const list = await request(app)
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.meta.total).toBeGreaterThan(0);

    const reference = list.body.data[0].reference;
    const updated = await request(app)
      .patch(`/api/admin/bookings/${reference}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(200);
    expect(updated.body.data.status).toBe('confirmed');
  });

  it('rejects an invalid status', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@safaritrails.com', password: 'SafariTrails2026!' });
    const token = login.body.data.token;

    await request(app)
      .patch('/api/admin/bookings/ST-AAAAAA')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'teleported' })
      .expect(400);
  });
});

describe('unknown routes', () => {
  it('404s with the standard envelope', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

/**
 * Express application factory.
 *
 * Kept separate from `index.ts` so tests can mount the app without opening a
 * socket (`supertest(app)`).
 */
import express, { type Express } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { env } from './env.js';
import { ApiError } from './lib/http.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

import { healthRouter } from './routes/health.js';
import { destinationsRouter } from './routes/destinations.js';
import { toursRouter } from './routes/tours.js';
import { bookingsRouter } from './routes/bookings.js';
import { inquiriesRouter } from './routes/inquiries.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header = same-origin, curl, or a server-to-server call.
    if (!origin) return callback(null, true);

    if (env.corsOrigins === '*') return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);

    return callback(
      new ApiError(403, 'CORS_REJECTED', `Origin ${origin} is not allowed by this API`),
    );
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

export function createApp(): Express {
  const app = express();

  // Vercel and most PaaS set X-Forwarded-For; trust exactly one hop.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The web app lives on a different origin than the API and loads images
      // from it, so cross-origin resource loading must stay allowed.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '256kb' }));

  // General limit: generous enough for browsing, tight enough to stop a bot.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        data: null,
        error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down a moment.' },
        meta: {},
      },
    }),
  );

  // The public booking form and login are the things worth protecting.
  const writeLimiter = rateLimit({
    windowMs: 10 * 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many submissions from this address. Try again in a few minutes.',
      },
      meta: {},
    },
  });

  app.use('/api/health', healthRouter);
  app.use('/api/destinations', destinationsRouter);
  app.use('/api/tours', toursRouter);
  app.use('/api/bookings', writeLimiter, bookingsRouter);
  app.use('/api/inquiries', writeLimiter, inquiriesRouter);
  app.use('/api/auth', writeLimiter, authRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/client.js';
import { inquiries } from '../db/schema.js';
import { asyncHandler, sendSuccess } from '../lib/http.js';

export const inquiriesRouter = Router();

const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  subject: z.string().trim().min(3, 'Add a subject').max(160),
  message: z.string().trim().min(10, 'Tell us a little more').max(4000),
});

/** POST /api/inquiries — the contact form. */
inquiriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const input = inquirySchema.parse(req.body);

    const [inquiry] = await db.insert(inquiries).values(input).returning({
      id: inquiries.id,
      createdAt: inquiries.createdAt,
    });

    return sendSuccess(
      res,
      {
        received: true,
        id: inquiry.id,
        message: 'Thanks — we have your message and will reply within one working day.',
      },
      undefined,
      201,
    );
  }),
);

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ApiClientError, request } from '../api/client';
import type { TourDetail } from '../api/types';
import { Icon } from './Icon';
import { Spinner } from './States';

type BookingModalProps = {
  tour: TourDetail;
  open: boolean;
  onClose: () => void;
};

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travellers: number;
  startDate: string;
  message: string;
};

const emptyForm: FormState = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  travellers: 1,
  startDate: '',
  message: '',
};

export function BookingModal({ tour, open, onClose }: BookingModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ field: string; message: string }[]>([]);
  const [done, setDone] = useState<{ reference: string; totalCents: number } | null>(null);

  // Reset whenever the modal is re-opened.
  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setError(null);
      setFieldErrors([]);
      setDone(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalCents = tour.priceCents * form.travellers;
  const perPerson = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: tour.currency,
    maximumFractionDigits: 0,
  }).format(tour.priceCents / 100);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => prev.filter((f) => f.field !== key));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors([]);

    try {
      const result = await request<{ reference: string; totalCents: number }>(
        '/api/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            tourSlug: tour.slug,
            customerName: form.customerName,
            customerEmail: form.customerEmail,
            customerPhone: form.customerPhone || undefined,
            travellers: form.travellers,
            startDate: form.startDate,
            message: form.message || undefined,
          }),
        },
      );
      setDone(result);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-forest-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close booking form"
        onClick={onClose}
      />

      <div className="animate-fade-rise relative z-10 my-0 w-full max-w-lg overflow-hidden rounded-t-2xl bg-sand-50 shadow-lift sm:my-8 sm:rounded-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-forest-700 shadow-soft transition-colors hover:bg-white"
          aria-label="Close"
        >
          <Icon name="close" className="h-4.5 w-4.5" />
        </button>

        {done ? (
          <div className="px-6 py-12 text-center sm:px-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold">Request received</h3>
            <p className="mt-3 text-sm leading-relaxed text-forest-700/70">
              Thank you — your request for <strong>{tour.title}</strong> is with our team. We
              will email you within one working day to confirm dates and availability.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest-900 px-5 py-2.5 font-mono text-sm font-semibold tracking-wider text-sand-100">
              {done.reference}
            </p>
            <button type="button" onClick={onClose} className="btn btn-primary mt-8">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[85vh] overflow-y-auto px-6 py-8 sm:px-8">
            <p className="eyebrow">Request to book</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">{tour.title}</h3>
            <p className="mt-1.5 text-sm text-forest-700/65">
              {perPerson} per person · {tour.durationDays}{' '}
              {tour.durationDays === 1 ? 'day' : 'days'} · max {tour.groupSizeMax} travellers
            </p>

            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
                <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="field-label" htmlFor="booking-name">
                  Full name
                </label>
                <input
                  id="booking-name"
                  className="field"
                  required
                  minLength={2}
                  value={form.customerName}
                  onChange={(e) => update('customerName', e.target.value)}
                  placeholder="Jane Doe"
                />
                {fieldErrors.find((f) => f.field === 'customerName') && (
                  <p className="mt-1 text-xs text-clay-600">
                    {fieldErrors.find((f) => f.field === 'customerName')?.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="booking-email">
                    Email
                  </label>
                  <input
                    id="booking-email"
                    type="email"
                    className="field"
                    required
                    value={form.customerEmail}
                    onChange={(e) => update('customerEmail', e.target.value)}
                    placeholder="jane@example.com"
                  />
                  {fieldErrors.find((f) => f.field === 'customerEmail') && (
                    <p className="mt-1 text-xs text-clay-600">
                      {fieldErrors.find((f) => f.field === 'customerEmail')?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="field-label" htmlFor="booking-phone">
                    Phone <span className="font-normal text-forest-700/45">(optional)</span>
                  </label>
                  <input
                    id="booking-phone"
                    className="field"
                    value={form.customerPhone}
                    onChange={(e) => update('customerPhone', e.target.value)}
                    placeholder="+256 7xx xxx xxx"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="booking-travellers">
                    Travellers
                  </label>
                  <select
                    id="booking-travellers"
                    className="field"
                    value={form.travellers}
                    onChange={(e) => update('travellers', Number(e.target.value))}
                  >
                    {Array.from({ length: tour.groupSizeMax }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'traveller' : 'travellers'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label" htmlFor="booking-date">
                    Preferred start date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    className="field"
                    required
                    value={form.startDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => update('startDate', e.target.value)}
                  />
                  {fieldErrors.find((f) => f.field === 'startDate') && (
                    <p className="mt-1 text-xs text-clay-600">
                      {fieldErrors.find((f) => f.field === 'startDate')?.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="booking-message">
                  Anything we should know?{' '}
                  <span className="font-normal text-forest-700/45">(optional)</span>
                </label>
                <textarea
                  id="booking-message"
                  className="field min-h-24 resize-y"
                  maxLength={1000}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Dietary requirements, mobility notes, a birthday to mark…"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-sand-100 px-4 py-3.5">
              <span className="text-sm font-medium text-forest-700/75">Estimated total</span>
              <span className="font-display text-xl font-semibold text-forest-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: tour.currency,
                  maximumFractionDigits: 0,
                }).format(totalCents / 100)}
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-forest-700/55">
              This is a request, not a payment. We hold your dates for 48 hours while we
              confirm availability, then send a booking confirmation.
            </p>

            <button type="submit" disabled={submitting} className="btn btn-primary mt-5 w-full">
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Sending…
                </>
              ) : (
                'Send booking request'
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

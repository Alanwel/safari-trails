import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiClientError, request } from '../api/client';
import { Icon } from '../components/Icon';
import { Reveal } from '../components/Reveal';
import { SectionHeading, Spinner } from '../components/States';
import { site } from '../data/site';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const emptyForm: FormState = { name: '', email: '', subject: '', message: '' };

export function Contact() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await request('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSent(true);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Something went wrong. Please try again or call us.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="Talk to us"
        title="Tell us what you have in mind"
        lede="A real person reads every message. We usually reply within a working day — and we will tell you honestly if a trip is not right for you."
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* --------------------------------------------------------------- */}
        {/* Form                                                              */}
        {/* --------------------------------------------------------------- */}
        <div>
          {sent ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                <Icon name="check" className="h-7 w-7" />
              </span>
              <h3 className="font-display text-2xl font-semibold">Message sent</h3>
              <p className="max-w-sm text-sm text-forest-700/70">
                Thanks for getting in touch. We will reply to your email within one working
                day.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="btn btn-ghost mt-3"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="card p-6 md:p-8">
              <p className="mb-6 rounded-xl bg-forest-50 px-4 py-3 text-sm leading-relaxed text-forest-700/75">
                <strong className="font-semibold text-forest-900">Booking a specific tour?</strong>{' '}
                Open the tour and use <em>Request to book</em> — you get a reference number and a
                reply within one working day.{' '}
                <Link to="/tours" className="font-semibold text-forest-700 underline underline-offset-2">
                  Browse tours
                </Link>
              </p>

              {error && (
                <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
                  <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="contact-name">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    className="field"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className="field"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="field-label" htmlFor="contact-subject">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  className="field"
                  required
                  minLength={3}
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  placeholder="Gorilla trekking in July — is it worth it?"
                />
              </div>

              <div className="mt-5">
                <label className="field-label" htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  className="field min-h-36 resize-y"
                  required
                  minLength={10}
                  maxLength={4000}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="How many of you are travelling, roughly when, and what matters most to you?"
                />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary mt-6">
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Sending…
                  </>
                ) : (
                  'Send message'
                )}
              </button>
            </form>
          )}
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Contact details                                                   */}
        {/* --------------------------------------------------------------- */}
        <aside className="space-y-4">
          <div className="card p-6">
            <h3 className="font-display text-sm font-semibold">Reach us directly</h3>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Icon name="phone" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ochre-500" />
                <span>
                  <a
                    href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
                    className="font-medium text-forest-900 hover:text-forest-700"
                  >
                    {site.contact.phone}
                  </a>
                  <span className="mt-0.5 block text-xs text-forest-700/55">
                    {site.contact.hours}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="mail" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ochre-500" />
                <a
                  href={`mailto:${site.contact.email}`}
                  className="font-medium text-forest-900 hover:text-forest-700"
                >
                  {site.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="message" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ochre-500" />
                <a
                  href={`https://wa.me/${site.contact.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-forest-900 hover:text-forest-700"
                >
                  WhatsApp us
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="map-pin" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ochre-500" />
                <span className="text-forest-800">{site.contact.address}</span>
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-sand-200">
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-forest-100 via-sand-100 to-forest-200">
              <div className="text-center">
                <Icon name="map-pin" className="mx-auto h-7 w-7 text-forest-600" />
                <p className="mt-2 text-xs font-medium text-forest-700/70">
                  Kampala, Uganda
                </p>
              </div>
            </div>
            <p className="bg-white px-5 py-3 text-xs text-forest-700/60">
              Replace this panel with an embedded map (Google Maps or Mapbox) when you have
              the operator&rsquo;s exact coordinates.
            </p>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-20">
        <SectionHeading eyebrow="Before you ask" title="Common questions" />
        <div className="mt-8 max-w-3xl overflow-hidden rounded-2xl border border-sand-200 bg-white">
          {site.faq.map((entry, index) => {
            const open = openFaq === index;
            return (
              <div key={entry.q} className="border-b border-sand-200 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-sand-50"
                  aria-expanded={open}
                >
                  <span className="font-display text-[1.0625rem] font-semibold text-forest-900">
                    {entry.q}
                  </span>
                  <Icon
                    name="chevron-down"
                    className={`h-4.5 w-4.5 shrink-0 text-forest-700/50 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <p className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-forest-800/80">
                    {entry.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Reveal>
        <div className="mt-16 rounded-2xl bg-forest-900 px-8 py-12 text-center text-sand-100">
          <h2 className="font-display text-2xl font-semibold text-sand-50">
            Prefer to talk it through?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-sand-200/75">
            Some trips are easier to understand over the phone. We are happy to talk it
            through — no obligation, no sales script.
          </p>
          <a
            href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
            className="btn btn-accent mt-6"
          >
            <Icon name="phone" className="h-4 w-4" />
            Call {site.contact.phone}
          </a>
        </div>
      </Reveal>
    </div>
  );
}

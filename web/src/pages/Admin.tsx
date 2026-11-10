/**
 * The admin shell.
 *
 * Five tabs, one job each:
 *
 *   Overview     — the numbers
 *   Tours        — the CMS: create, edit, publish, delete
 *   Destinations — the CMS: the places tours belong to
 *   Bookings     — booking requests and their status
 *   Messages     — contact-form enquiries
 *
 * The two content tabs are the ones this file exists for. Before the CMS,
 * the admin panel could only *read* the catalogue, so adding a tour meant a
 * database query by hand.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ApiClientError, formatDate, formatMoney } from '../api/client';
import { useAdminApi } from '../admin/useAdminApi';
import { useAdminRequest } from '../admin/useAdminRequest';
import type { AdminStats, Booking, BookingStatus, Inquiry } from '../api/types';
import { AccountTab } from '../admin/AccountTab';
import { AdminLogin, useAdminAuth } from '../admin/AdminAuth';
import { DestinationsTab } from '../admin/DestinationsTab';
import { ToursTab } from '../admin/ToursTab';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Spinner } from '../components/States';

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];

type AdminView =
  | 'overview'
  | 'tours'
  | 'destinations'
  | 'bookings'
  | 'messages'
  | 'account';

const VIEWS: { key: AdminView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tours', label: 'Tours' },
  { key: 'destinations', label: 'Destinations' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'messages', label: 'Messages' },
  { key: 'account', label: 'Account' },
];

const statusStyles: Record<BookingStatus, string> = {
  pending: 'bg-ochre-100 text-ochre-700',
  confirmed: 'bg-forest-100 text-forest-700',
  cancelled: 'bg-clay-500/15 text-clay-600',
  completed: 'bg-sand-200 text-forest-700/80',
};

export function Admin() {
  const { token, admin, signOut } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  /**
   * The tab lives in the URL so a link like /admin?tab=tours works, and so
   * the browser's back button behaves the way people expect.
   */
  const tabParam = searchParams.get('tab');
  const view: AdminView = (VIEWS.find((v) => v.key === tabParam)?.key ??
    'overview') as AdminView;

  const setView = (next: AdminView) => {
    setSearchParams(next === 'overview' ? {} : { tab: next });
  };

  const bookingsPath = token
    ? `/api/admin/bookings?${
        new URLSearchParams({
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(search ? { q: search } : {}),
        }).toString()
      }`
    : null;

  const bookings = useAdminApi<Booking[]>(bookingsPath);
  const stats = useAdminApi<AdminStats>(token ? '/api/admin/stats' : null);

  /**
   * Messages are fetched only when the Messages tab is open, so signing in
   * does not pull two lists at once.
   */
  const inquiries = useAdminApi<Inquiry[]>(
    token && view === 'messages' ? '/api/admin/inquiries' : null,
  );

  // Every admin WRITE goes through useAdminRequest(), which attaches the
  // token. The plain `request()` helper does not — and a write without the
  // token comes back as "Sign in to continue" to somebody who IS signed in.
  const adminRequest = useAdminRequest();

  const setBookingStatus = async (reference: string, status: BookingStatus) => {
    setUpdating(reference);
    try {
      await adminRequest(`/api/admin/bookings/${reference}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      bookings.refetch();
      stats.refetch();
    } catch (err) {
      alert(
        err instanceof ApiClientError ? err.message : 'Could not update that booking.',
      );
    } finally {
      setUpdating(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Login                                                                  */
  /* ---------------------------------------------------------------------- */
  if (!token) return <AdminLogin />;

  /* ---------------------------------------------------------------------- */
  /* Dashboard                                                               */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="container-page py-12 md:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Operator dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {VIEWS.find((v) => v.key === view)?.label}
          </h1>
          {admin && (
            <p className="mt-1 text-sm text-forest-700/60">
              Signed in as {admin.name} · {admin.email}
            </p>
          )}
        </div>
        <button type="button" onClick={signOut} className="btn btn-ghost">
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-sand-200">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              view === v.key
                ? 'border-forest-700 text-forest-900'
                : 'border-transparent text-forest-700/55 hover:text-forest-800'
            }`}
          >
            {v.label}
            {v.key === 'bookings' && stats.data && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  view === v.key
                    ? 'bg-forest-100 text-forest-700'
                    : 'bg-sand-200 text-forest-700/70'
                }`}
              >
                {stats.data.totalBookings}
              </span>
            )}
            {v.key === 'messages' && stats.data && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  view === v.key
                    ? 'bg-forest-100 text-forest-700'
                    : 'bg-sand-200 text-forest-700/70'
                }`}
              >
                {stats.data.openInquiries}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats — only on the overview, so the other tabs are not crowded. */}
      {view === 'overview' && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.loading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton h-28 rounded-2xl" />
              ))
            : [
                {
                  label: 'Booking requests',
                  value: stats.data?.totalBookings ?? 0,
                  icon: 'ticket' as const,
                },
                {
                  label: 'Awaiting reply',
                  value: stats.data?.byStatus.pending ?? 0,
                  icon: 'clock' as const,
                },
                {
                  label: 'Confirmed revenue',
                  value: formatMoney(stats.data?.confirmedRevenueCents ?? 0),
                  icon: 'check' as const,
                },
                {
                  label: 'Travellers booked',
                  value: stats.data?.travellers ?? 0,
                  icon: 'users' as const,
                },
                {
                  label: 'Messages',
                  value: stats.data?.openInquiries ?? 0,
                  icon: 'message' as const,
                },
              ].map((card) => (
                <div key={card.label} className="card p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                    <Icon name={card.icon} className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-4 font-display text-2xl font-semibold text-forest-900">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-sm text-forest-700/60">{card.label}</p>
                </div>
              ))}
        </div>
      )}

      {/* Content tabs ------------------------------------------------- */}
      {view === 'account' && <AccountTab />}

      {view === 'tours' && <ToursTab token={token} />}
      {view === 'destinations' && <DestinationsTab token={token} />}

      {view === 'messages' && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          {inquiries.loading && (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-forest-700/60">
              <Spinner className="h-5 w-5" />
              Loading messages…
            </div>
          )}

          {inquiries.error && (
            <div className="p-6">
              <ErrorState message={inquiries.error} onRetry={inquiries.refetch} />
            </div>
          )}

          {!inquiries.loading && !inquiries.error && inquiries.data?.length === 0 && (
            <div className="p-6">
              <EmptyState
                title="No messages yet"
                message="Enquiries sent from the contact form land here. Booking requests made from a tour page are on the Bookings tab."
              />
            </div>
          )}

          {inquiries.data && inquiries.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="border-b border-sand-200 bg-sand-50 text-xs uppercase tracking-wider text-forest-700/55">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Received</th>
                    <th className="px-5 py-3 font-semibold">From</th>
                    <th className="px-5 py-3 font-semibold">Subject</th>
                    <th className="px-5 py-3 font-semibold">Message</th>
                    <th className="px-5 py-3 font-semibold">Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {inquiries.data.map((inquiry) => (
                    <tr key={inquiry.id} className="transition-colors hover:bg-sand-50">
                      <td className="px-5 py-4 text-xs text-forest-700/60">
                        {formatDate(inquiry.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-forest-900">{inquiry.name}</span>
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="mt-0.5 block text-xs text-forest-700/60 hover:text-ochre-500"
                        >
                          {inquiry.email}
                        </a>
                      </td>
                      <td className="px-5 py-4 font-medium text-forest-800/90">
                        {inquiry.subject}
                      </td>
                      <td className="max-w-md px-5 py-4 text-forest-800/80">
                        <span className="whitespace-pre-wrap">{inquiry.message}</span>
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
                            `Re: ${inquiry.subject}`,
                          )}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-sand-300 px-2.5 py-1.5 text-xs font-medium text-forest-700 transition-colors hover:border-forest-400 hover:text-forest-900"
                        >
                          <Icon name="mail" className="h-3.5 w-3.5" />
                          Reply
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'bookings' && (
        <>
          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['all', ...STATUSES].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
                    statusFilter === status
                      ? 'bg-forest-700 text-sand-50'
                      : 'border border-sand-300 text-forest-700 hover:bg-sand-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative ml-auto w-full sm:w-64">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-700/40"
              />
              <input
                className="field !pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Reference, name, email…"
              />
            </div>
          </div>

          {/* Bookings table */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
            {bookings.loading && (
              <div className="flex items-center justify-center gap-3 py-20 text-sm text-forest-700/60">
                <Spinner className="h-5 w-5" />
                Loading bookings…
              </div>
            )}

            {bookings.error && (
              <div className="p-6">
                <ErrorState message={bookings.error} onRetry={bookings.refetch} />
              </div>
            )}

            {!bookings.loading && !bookings.error && bookings.data?.length === 0 && (
              <div className="p-6">
                <EmptyState
                  title="No bookings here"
                  message="Nothing matches the current filter. Try another status or clear the search."
                />
              </div>
            )}

            {bookings.data && bookings.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[54rem] text-left text-sm">
                  <thead className="border-b border-sand-200 bg-sand-50 text-xs uppercase tracking-wider text-forest-700/55">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Reference</th>
                      <th className="px-5 py-3 font-semibold">Guest</th>
                      <th className="px-5 py-3 font-semibold">Trip</th>
                      <th className="px-5 py-3 font-semibold">Start</th>
                      <th className="px-5 py-3 font-semibold">Total</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200">
                    {bookings.data.map((booking) => (
                      <tr key={booking.id} className="transition-colors hover:bg-sand-50">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-forest-900">
                            {booking.reference}
                          </span>
                          <span className="mt-0.5 block text-xs text-forest-700/50">
                            {formatDate(booking.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-medium text-forest-900">
                            {booking.customerName}
                          </span>
                          <span className="mt-0.5 block text-xs text-forest-700/60">
                            {booking.customerEmail}
                          </span>
                          <span className="mt-0.5 block text-xs text-forest-700/60">
                            {booking.travellers} traveller{booking.travellers === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-forest-800/85">{booking.tourTitle}</td>
                        <td className="px-5 py-4 text-forest-800/85">
                          {formatDate(booking.startDate)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-forest-900">
                          {formatMoney(booking.totalCents)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                              statusStyles[booking.status]
                            }`}
                          >
                            {booking.status}
                          </span>
                          <div className="mt-2 flex gap-1.5">
                            {STATUSES.filter((s) => s !== booking.status).map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={updating === booking.reference}
                                onClick={() => setBookingStatus(booking.reference, status)}
                                className="rounded-md border border-sand-300 px-2 py-1 text-[0.6875rem] font-medium capitalize text-forest-700 transition-colors hover:border-forest-400 hover:text-forest-900 disabled:opacity-40"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

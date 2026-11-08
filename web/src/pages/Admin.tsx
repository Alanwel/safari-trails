import { useEffect, useState } from 'react';

import { ApiClientError, formatDate, formatMoney, request } from '../api/client';
import { useApi } from '../api/hooks';
import type { AdminStats, Booking, BookingStatus } from '../api/types';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Spinner } from '../components/States';

const TOKEN_KEY = 'safari-trails-admin-token';

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];

const statusStyles: Record<BookingStatus, string> = {
  pending: 'bg-ochre-100 text-ochre-700',
  confirmed: 'bg-forest-100 text-forest-700',
  cancelled: 'bg-clay-500/15 text-clay-600',
  completed: 'bg-sand-200 text-forest-700/80',
};

export function Admin() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const bookingsPath = token
    ? `/api/admin/bookings?${
        new URLSearchParams({
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(search ? { q: search } : {}),
        }).toString()
      }`
    : null;

  const bookings = useApi<Booking[]>(bookingsPath, { token: token ?? undefined });
  const stats = useApi<AdminStats>(token ? '/api/admin/stats' : null, {
    token: token ?? undefined,
  });

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const result = await request<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
    } catch (err) {
      setLoginError(
        err instanceof ApiClientError ? err.message : 'Could not sign in. Please try again.',
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const setBookingStatus = async (reference: string, status: BookingStatus) => {
    setUpdating(reference);
    try {
      await request(`/api/admin/bookings/${reference}`, {
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
  if (!token) {
    return (
      <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-100 text-forest-700">
              <Icon name="shield" className="h-5.5 w-5.5" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-semibold">Operator sign in</h1>
            <p className="mt-2 text-sm text-forest-700/65">
              Manage booking requests and enquiries.
            </p>

            {loginError && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
                <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={login} className="mt-6 space-y-4">
              <div>
                <label className="field-label" htmlFor="admin-email">
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  className="field"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@safaritrails.com"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="admin-password">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className="field"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                />
              </div>
              <button type="submit" disabled={loggingIn} className="btn btn-primary w-full">
                {loggingIn ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="mt-6 border-t border-sand-200 pt-4 text-xs leading-relaxed text-forest-700/55">
              Seeded credentials are in <code>api/.env</code> (
              <code>ADMIN_EMAIL</code> / <code>ADMIN_PASSWORD</code>). Change them before
              deploying.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Dashboard                                                               */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="container-page py-12 md:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Operator dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Bookings</h1>
        </div>
        <button
          type="button"
          onClick={() => setToken(null)}
          className="btn btn-ghost"
        >
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))
          : [
              {
                label: 'Total requests',
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

      {/* Filters */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
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
                      <span className="font-medium text-forest-900">{booking.customerName}</span>
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

      {bookings.error && (
        <button
          type="button"
          onClick={() => setToken(null)}
          className="btn btn-ghost mt-6"
        >
          Sign in again
        </button>
      )}
    </div>
  );
}

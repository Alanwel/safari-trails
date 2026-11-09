/**
 * Admin authentication, shared across every admin screen.
 *
 * ---------------------------------------------------------------------------
 * Why a context
 * ---------------------------------------------------------------------------
 * The admin token used to live inside `pages/Admin.tsx`. That worked when the
 * admin panel was a single page. The moment you add a second screen — the
 * tour editor — the token has to be reachable from both, and copying it into
 * props would be noise. A context is the smallest thing that solves it.
 *
 * The token lives in `localStorage` so a refresh does not sign you out. That
 * is a deliberate trade: an admin session that survives a page reload is much
 * nicer to work with than one that does not, and the token expires on its own
 * after 12 hours.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ApiClientError, request } from '../api/client';
import { Icon } from '../components/Icon';

const TOKEN_KEY = 'safari-trails-admin-token';

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

type AdminAuthValue = {
  token: string | null;
  admin: AdminUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Called when a request comes back 401 — the stored token is dead. */
  sessionExpired: () => void;
  /** True when the last sign-out was caused by an expired session. */
  expired: boolean;
};

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY),
  );
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  /**
   * Fetch the signed-in admin's details so the UI can show a name instead of
   * "operator". A failure here must NOT sign the user out — the token may
   * still be perfectly good, and logging them out because a profile call
   * failed would be hostile.
   */
  useEffect(() => {
    if (!token) {
      setAdmin(null);
      return;
    }
    let cancelled = false;
    request<{ admin: AdminUser }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((result) => {
        if (!cancelled) setAdmin(result.admin);
      })
      .catch(() => {
        if (!cancelled) setAdmin(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(async (nextEmail: string, nextPassword: string) => {
    const result = await request<{ token: string; admin: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: nextEmail, password: nextPassword }),
    });
    setToken(result.token);
    setAdmin(result.admin ?? null);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setExpired(false);
  }, []);

  /**
   * The stored token stopped working. Drop it and say why, so the operator
   * sees "your session expired" on the sign-in form rather than on a dead
   * panel that offers no way forward.
   */
  const sessionExpired = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setExpired(true);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ token, admin, signIn, signOut, sessionExpired, expired }),
    [token, admin, signIn, signOut, sessionExpired, expired],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  }
  return value;
}

/**
 * The sign-in form.
 *
 * Rendered by any admin screen when there is no token, so the operator always
 * lands on a way in instead of a blank page.
 */
export function AdminLogin({ heading = 'Operator sign in' }: { heading?: string }) {
  const { signIn, expired } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not sign in. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-100 text-forest-700">
            <Icon name="shield" className="h-5.5 w-5.5" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold">{heading}</h1>
          <p className="mt-2 text-sm text-forest-700/65">
            Manage tours, destinations, booking requests and enquiries.
          </p>

          {(error || expired) && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-ochre-100 px-4 py-3 text-sm text-ochre-700">
              <Icon name="clock" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <span>
                {expired
                  ? 'Your session expired — it lasts 12 hours. Please sign in again.'
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="field-label" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

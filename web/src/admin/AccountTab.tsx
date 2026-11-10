/**
 * The Account tab — change the operator's own email and password.
 *
 * ---------------------------------------------------------------------------
 * Why the current password is asked for
 * ---------------------------------------------------------------------------
 * A token is not proof of identity; it is proof that somebody once had the
 * password. If the token leaked, letting it change the password would let the
 * thief take the account over permanently. So changing anything asks for the
 * current password first.
 *
 * When the password changes, the API stamps `password_changed_at` and issues
 * a fresh token. Every token issued before that moment is refused by the
 * server, so the old session is genuinely closed — not just the browser's
 * copy of it.
 */
import { useState } from 'react';

import { useAdminAuth } from './AdminAuth';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/States';

export function AccountTab() {
  const { token, admin, replaceToken } = useAdminAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(admin?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password && password !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    if (password && password.length < 10) {
      setError('Use at least 10 characters for the new password.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/admin/account`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({
          currentPassword,
          email: email.trim(),
          password: password || undefined,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          payload?.error?.message ?? `Could not save your account (${res.status}).`,
        );
        return;
      }

      // A fresh token comes back with the change, so the session continues
      // without a re-login.
      if (payload?.data?.token) replaceToken(payload.data.token);
      if (payload?.data?.admin?.email) setEmail(payload.data.admin.email);

      setCurrentPassword('');
      setPassword('');
      setConfirm('');
      setMessage(
        payload?.data?.passwordChanged
          ? 'Saved. Your password has changed and every other session was signed out.'
          : 'Saved.',
      );
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 max-w-2xl">
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Your account
        </h2>
        <p className="mt-1 text-sm text-forest-700/65">
          This is the login for the operator dashboard. Changing the password
          signs out every other device that was signed in.
        </p>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
            <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-forest-100 px-4 py-3 text-sm text-forest-700">
            <Icon name="check" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="acc-email">
              Email
            </label>
            <input
              id="acc-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="acc-current">
              Current password
            </label>
            <input
              id="acc-current"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-forest-700/55">
              Needed to prove it is you. Without it, anyone holding a copy of
              this session could change the password.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="acc-new">
                New password
              </label>
              <input
                id="acc-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="Leave blank to keep it"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="acc-confirm">
                Confirm new password
              </label>
              <input
                id="acc-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field"
                placeholder="Type it again"
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? (
              <>
                <Spinner className="h-4 w-4" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

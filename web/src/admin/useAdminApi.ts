/**
 * The admin data hook.
 *
 * Every admin screen needs the same two things: the token, and a way to
 * notice that the token has stopped working. This wraps `useApi` with both,
 * so a screen cannot forget the second one.
 *
 * Without it, an expired session left the operator staring at a broken
 * panel reading "Your session has expired" with no way forward except
 * hunting for a Sign out button. Now the token is cleared and the sign-in
 * form comes back on its own.
 */
import { useCallback } from 'react';

import { ApiClientError } from '../api/client';
import { useApi, type ApiState } from '../api/hooks';
import { useAdminAuth } from './AdminAuth';

export function useAdminApi<T>(
  path: string | null,
): ApiState<T> & { refetch: () => void } {
  const { token, signOut, sessionExpired } = useAdminAuth();

  /**
   * This callback MUST be stable. `useApi` lists it in the fetch effect's
   * dependency array, so a new function on every render would restart the
   * request on every render — an endless loop that never resolves and
   * leaves the screen spinning on "Loading…".
   */
  const onUnauthorized = useCallback(() => {
    // Only a session that existed is worth reporting as expired. A plain
    // 401 on a page nobody signed into is just "not signed in".
    if (token) sessionExpired();
    else signOut();
  }, [token, sessionExpired, signOut]);

  return useApi<T>(path, {
    token: token ?? undefined,
    onUnauthorized,
  });
}

export { ApiClientError };

/**
 * The admin request helper.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 * `request()` in `api/client.ts` does NOT attach the admin token. The GETs
 * work because `useApi` adds the header for you. The WRITES — the ones that
 * change a booking's status, delete a tour, publish a destination — are
 * plain `request()` calls, and if one of them forgets the header the API
 * answers 401 and the operator sees:
 *
 *     safari-trails-web.vercel.app says
 *     Sign in to continue
 *
 * ...even though they ARE signed in. That happened once. This helper makes
 * the mistake impossible: every admin write goes through it, and the token
 * is attached by definition.
 */
import { useCallback } from 'react';

import { request } from '../api/client';
import { useAdminAuth } from './AdminAuth';

export function useAdminRequest() {
  const { token } = useAdminAuth();

  return useCallback(
    <T,>(path: string, options: RequestInit = {}) =>
      request<T>(path, {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: `Bearer ${token ?? ''}`,
        },
      }),
    [token],
  );
}

/**
 * A very small data-fetching hook.
 *
 * Deliberately not a state-management library: the whole app needs three
 * things — fetch on mount, track loading, track error — so a 30-line hook
 * beats a dependency. Swap in TanStack Query later if the app grows.
 */
import { useCallback, useEffect, useState } from 'react';

import { requestWithMeta } from './client';

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Pagination / facet info returned alongside the data. */
  meta: Record<string, unknown> | null;
};

export function useApi<T>(
  path: string | null,
  options: { token?: string } = {},
): ApiState<T> & { refetch: () => void } {
  const { token } = options;
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: Boolean(path),
    error: null,
    meta: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null, meta: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    requestWithMeta<T>(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(({ data, meta }) => {
        if (!cancelled) setState({ data, loading: false, error: null, meta });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err.message, meta: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, token, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, refetch };
}

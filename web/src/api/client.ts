/**
 * Typed API client.
 *
 * The API always answers with the same envelope:
 *   { data, error, meta }
 * so there is exactly one place that knows how to unwrap it, and exactly one
 * place that knows how to turn a failure into a readable message.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Field-level messages, if the server sent any. */
  get fieldErrors(): { field: string; message: string }[] {
    if (!Array.isArray(this.details)) return [];
    return this.details as { field: string; message: string }[];
  }
}

type Envelope<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data } = await requestWithMeta<T>(path, options);
  return data;
}

/** Same as `request`, but also returns the envelope's `meta` block. */
export async function requestWithMeta<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error;
    throw new ApiClientError(
      error?.message ?? `Request failed with status ${res.status}`,
      error?.code ?? 'UNKNOWN',
      res.status,
      error?.details,
    );
  }

  const envelope = payload as Envelope<T>;
  return { data: envelope.data, meta: envelope.meta ?? {} };
}

/** Query-string builder that skips empty values. */
export function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * The absolute URL of an API path.
 *
 * Needed when the request body is NOT JSON — the image uploader posts raw
 * bytes, so it cannot go through `request()`.
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Turn a stored image path into a URL the browser can load.
 *
 * The API stores `/images/tours/foo.jpg` (a path relative to the web app).
 * In production the API and the web app live on different hosts, so a bare
 * path would 404 — we resolve it against the web app's own base URL.
 * Absolute URLs (a Supabase Storage link, for example) are passed through.
 */
export function resolveImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}${url.replace(/^\//, '')}`;
}

/**
 * How many minor units make one major unit.
 *
 * Prices are stored in minor units (cents) so no arithmetic ever touches a
 * float. Currencies with no minor unit — the Ugandan shilling, for one —
 * store whole shillings.
 */
const MINOR_UNITS: Record<string, number> = { UGX: 1, KES: 1, TZS: 1 };

export function minorUnits(currency = 'USD'): number {
  return MINOR_UNITS[currency] ?? 100;
}

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: minorUnits(currency) === 1 ? 0 : 0,
  }).format(cents / minorUnits(currency));
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

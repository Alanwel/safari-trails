/**
 * Small helpers shared across routes.
 */

/** Money is stored in minor units (cents) everywhere — never as a float. */
export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Human-friendly booking reference, e.g. `ST-7QK4M2`.
 * Uses an alphabet without easily-confused characters (no 0/O, no 1/I/L).
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function bookingReference(): string {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `ST-${out}`;
}

/** Parse a query-string number, treating "" and null as "not provided". */
export function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

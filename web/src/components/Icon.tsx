/**
 * Inline SVG icons.
 *
 * One component, one map of path data — no icon package, no bundle bloat,
 * and every glyph inherits `currentColor` so it themes automatically.
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'menu'
  | 'close'
  | 'search'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-down'
  | 'check'
  | 'star'
  | 'map-pin'
  | 'clock'
  | 'users'
  | 'group'
  | 'ticket'
  | 'compass'
  | 'shield'
  | 'calendar'
  | 'phone'
  | 'mail'
  | 'message'
  | 'instagram'
  | 'facebook'
  | 'filter'
  | 'gauge'
  | 'leaf'
  | 'alert'
  | 'info';

const paths: Record<IconName, React.ReactNode> = {
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M20 12H5M11 18l-6-6 6-6" />
    </>
  ),
  'chevron-down': (
    <>
      <path d="M6 9.5l6 6 6-6" />
    </>
  ),
  check: (
    <>
      <path d="M4.5 12.5l5 5 10-11" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.2l2.7 5.6 6.1.85-4.4 4.3 1.05 6.05L12 17.1l-5.45 2.9L7.6 13.95 3.2 9.65l6.1-.85L12 3.2z" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21c4-4.4 6-7.6 6-10.2A6 6 0 006 10.8C6 13.4 8 16.6 12 21z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9.5" cy="8" r="3.3" />
      <path d="M3.5 19.5v-1.3A3.7 3.7 0 017.2 14.5h4.6a3.7 3.7 0 013.7 3.7v1.3" />
      <path d="M16 5.2a3.3 3.3 0 010 5.6M17.5 14.9a3.7 3.7 0 013 3.6v1" />
    </>
  ),
  group: (
    <>
      <circle cx="12" cy="7.5" r="3.6" />
      <path d="M4.5 20.5v-1.4A4.6 4.6 0 019.1 14.5h5.8a4.6 4.6 0 014.6 4.6v1.4" />
      <path d="M6.5 4.2a3.6 3.6 0 000 6.6M17.5 4.2a3.6 3.6 0 010 6.6" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 9.5V7.5a2 2 0 012-2h12a2 2 0 012 2v2a2.5 2.5 0 000 5v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2.5 2.5 0 000-5z" />
      <path d="M13 6.5v1M13 11v1M13 15.5v1M13 20v-1" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 2.8v5c0 4.5-2.9 8.4-7 10.2-4.1-1.8-7-5.7-7-10.2v-5L12 3z" />
      <path d="M9.2 12.2l1.9 1.9 3.7-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  phone: (
    <>
      <path d="M5 3.5h3l1.8 4.6-2.4 1.4a11.5 11.5 0 005.1 5.1l1.4-2.4L19.5 14v3a2 2 0 01-2.2 2A16.5 16.5 0 013.5 5.7 2 2 0 015 3.5z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.8 7l8.2 5.6L20.2 7" />
    </>
  ),
  message: (
    <>
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 01-2.6-.35L4.5 20.5l1.3-3.6a6.9 6.9 0 01-2.3-5c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.9h.01" />
    </>
  ),
  facebook: (
    <>
      <path d="M14.5 8.5V7a1.5 1.5 0 011.5-1.5h1.5V2.5H15A4.5 4.5 0 0010.5 7v1.5H8v3.5h2.5V21H14v-9h2.5l.5-3.5H14z" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 17a8 8 0 1116 0" />
      <path d="M12 17l4-5" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C10 4 4 9 4 16c0 1.6.4 3 1 4 1-6 5-9 10-10-3 2-6 5-7 10 6 .6 11-3 12-9 .3-2.3.3-5 0-7z" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  /** Filled icons (star, leaf) need fill; stroked ones need stroke. */
  filled?: boolean;
};

export function Icon({ name, filled = false, className = 'h-5 w-5', ...rest }: IconProps) {
  const isFilled = filled || name === 'star' || name === 'leaf';

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

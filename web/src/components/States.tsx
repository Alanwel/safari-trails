import { Icon } from './Icon';

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  action,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'
      }`}
    >
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <p className="eyebrow mb-3">
            <span className="h-px w-6 bg-ochre-400" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
        {lede && (
          <p className="mt-4 text-base leading-relaxed text-forest-700/70">{lede}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  message = 'Try adjusting your filters to see more results.',
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 text-forest-500">
        <Icon name="search" className="h-6 w-6" />
      </span>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-forest-700/65">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  message = 'We could not load this right now.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ochre-100 text-ochre-700">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <h3 className="font-display text-lg font-semibold">Something went wrong</h3>
      <p className="max-w-sm text-sm text-forest-700/65">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost mt-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

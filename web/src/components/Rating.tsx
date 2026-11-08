import { Icon } from './Icon';

type RatingProps = {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
};

export function Rating({ value, count, size = 'sm', className = '' }: RatingProps) {
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const rounded = Math.round(value);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            className={`${starClass} ${
              star <= rounded ? 'text-ochre-500' : 'text-sand-300'
            }`}
          />
        ))}
      </span>
      <span className="text-sm font-semibold text-forest-800">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-sm text-forest-700/60">({count})</span>
      )}
      <span className="sr-only">
        Rated {value} out of 5{count !== undefined ? ` from ${count} reviews` : ''}
      </span>
    </span>
  );
}

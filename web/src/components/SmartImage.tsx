/**
 * An image with a graceful fallback.
 *
 * If there is no photo (or the photo 404s) we render a warm gradient tile
 * with the destination name instead of a broken-image icon — the card still
 * looks deliberate rather than broken.
 */
import { useState } from 'react';

import { resolveImage } from '../api/client';

type SmartImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Text shown on the fallback tile. */
  fallbackLabel?: string;
  loading?: 'lazy' | 'eager';
};

export function SmartImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  loading = 'lazy',
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const url = resolveImage(src);

  if (!url || failed) {
    return (
      <div
        className={`flex items-end bg-gradient-to-br from-forest-700 via-forest-600 to-forest-800 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackLabel && (
          <span className="font-display text-sm font-semibold text-sand-100/90">{fallbackLabel}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

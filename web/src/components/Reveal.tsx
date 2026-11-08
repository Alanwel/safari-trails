import { useEffect, useRef, useState } from 'react';

/**
 * Fade content in the first time it scrolls into view.
 *
 * Uses IntersectionObserver (no library). If the browser does not support
 * it, or the user prefers reduced motion, the content is simply shown.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);

    // Safety net: content must never be permanently invisible. If the
    // observer has not fired within a moment — a restored scroll position,
    // an odd container, a browser quirk — show it anyway.
    const failsafe = window.setTimeout(() => setShown(true), 1500);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${shown ? 'animate-fade-rise' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

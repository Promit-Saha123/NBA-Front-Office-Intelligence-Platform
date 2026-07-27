"use client";

import { useState } from "react";

export interface ImageWithFallbackProps {
  /** Omitted (the common case today — no real logo/headshot pipeline exists
   *  yet) means the fallback renders permanently, with no <img> at all. */
  src?: string;
  alt: string;
  /** The generated placeholder (e.g. a colored initials badge) — shown
   *  immediately, and for as long as `src` is absent, loading, or failed. */
  fallback: React.ReactNode;
  className?: string;
}

/**
 * One mechanism covers all three states the team/player media components
 * need (loading, missing, broken): the fallback is always in the DOM: an
 * `<img>` only renders when `src` is supplied, stays hidden until it fires
 * `onLoad`, and simply never swaps in on `onError` — leaving the fallback
 * visible either way. No layout shift, no separate "broken" visual.
 *
 * Accessibility: the accessible name lives on this wrapper (`role="img"`
 * `aria-label`); the inner `<img>` is `aria-hidden` with an empty `alt` so
 * assistive tech never announces the same name twice.
 */
export function ImageWithFallback({ src, alt, fallback, className }: ImageWithFallbackProps) {
  const [loaded, setLoaded] = useState(false);
  const showImage = src !== undefined && loaded;

  return (
    <span className={className} role="img" aria-label={alt}>
      {!showImage ? fallback : null}
      {src !== undefined ? (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          style={{ display: loaded ? undefined : "none" }}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
    </span>
  );
}

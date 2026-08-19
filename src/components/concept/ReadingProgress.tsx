'use client';

import { useEffect, useState } from 'react';

/**
 * ReadingProgress — a thin accent-colored bar fixed to the top of the
 * viewport that grows as the reader scrolls through the concept article.
 *
 * The bar is rendered only on concept pages (where long-form reading
 * happens) and uses `position: fixed` so it survives main scroll. It
 * sits above the TopBar (z-40 vs z-20).
 *
 * The progress value is computed from `document.documentElement`
 * scroll position relative to total scrollable height.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0;
      setProgress(pct * 100);
    };

    // Initial measurement (in case the page loaded scrolled).
    update();

    // rAF-throttled scroll listener for smoothness.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        update();
        raf = 0;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="reading-progress left-0 right-0 md:left-56"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="reading-progress__bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

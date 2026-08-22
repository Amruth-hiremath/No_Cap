'use client';

import { Play, Pause, X, Clock, Coffee } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn, formatTimer } from '@/lib/utils';
import type { FocusDuration } from '@/lib/types';
import type { ReactNode } from 'react';

const DURATIONS: { value: FocusDuration; label: string }[] = [
  { value: 5, label: '5m' },
  { value: 12, label: '12m' },
  { value: 25, label: '25m' },
];

/**
 * FocusOverlay — distraction-free reading surface.
 *
 * Layout:
 *   ┌───────────────────────────────────────────┐
 *   │                          [timer widget]   │  ← top-right, compact
 *   │                                           │
 *   │       [article — max-w-3xl, centered]     │  ← scrollable main column
 *   │       ...                                 │
 *   │                                           │
 *   │              [Exit focus (Esc)]           │  ← bottom-center pill
 *   └───────────────────────────────────────────┘
 *
 * The reading-progress bar (rendered by ConceptView) stays at the very top
 * of the viewport via `position: fixed` — see globals.css for the focus-mode
 * override that makes it span the full width.
 *
 * Enter / leave transitions are handled by the `animate-focus-enter` class
 * on the root. `prefers-reduced-motion` disables it (see globals.css).
 */
export function FocusOverlay({ children }: { children: ReactNode }) {
  const session = useStore((s) => s.focus_session);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const startFocusTimer = useStore((s) => s.startFocusTimer);
  const pauseFocusTimer = useStore((s) => s.pauseFocusTimer);
  const resumeFocusTimer = useStore((s) => s.resumeFocusTimer);
  const stopFocusTimer = useStore((s) => s.stopFocusTimer);

  const isComplete = session.remaining === 0 && session.duration > 0;
  const hasStarted = session.duration > 0 && (session.running || session.remaining < session.duration * 60);

  return (
    <div className="fixed inset-0 z-40 bg-grid animate-focus-enter">
      {/* Top-right: compact timer widget. Stays out of the reading column. */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {isComplete ? (
          <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-2.5 py-1.5 text-xs animate-fade-in">
            <Coffee className="h-3 w-3 text-success" aria-hidden />
            <span className="font-medium text-success">Done</span>
            <button
              onClick={stopFocusTimer}
              className="ml-1 text-text-muted hover:text-text-primary"
              aria-label="Reset timer"
            >
              Reset
            </button>
          </div>
        ) : session.running ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs animate-fade-in">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="tnum font-medium text-text-primary">{formatTimer(session.remaining)}</span>
            <button
              onClick={pauseFocusTimer}
              className="ml-1 flex items-center rounded p-1 text-text-muted hover:bg-surface-subtle hover:text-text-primary"
              aria-label="Pause timer"
            >
              <Pause className="h-3 w-3" />
            </button>
            <button
              onClick={stopFocusTimer}
              className="flex items-center rounded p-1 text-text-muted hover:bg-surface-subtle hover:text-text-primary"
              aria-label="End session"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 text-xs animate-fade-in">
            <Clock className="ml-1 h-3 w-3 text-text-muted" aria-hidden />
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => startFocusTimer(d.value)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  hasStarted && session.duration === d.value
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                )}
                aria-label={`Start ${d.label} timer`}
              >
                {d.label}
              </button>
            ))}
            {hasStarted && (
              <button
                onClick={resumeFocusTimer}
                className="ml-0.5 flex items-center rounded bg-accent px-2 py-1 text-xs font-medium text-text-inverse hover:bg-accent-hover"
                aria-label="Resume timer"
              >
                <Play className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reading column — scrollable, centered at max-w-3xl.
          Bottom padding leaves room for the exit pill.
          id="main-content" matches the skip-link target so keyboard users
          can jump straight to the article even in focus mode. */}
      <main id="main-content" className="h-full overflow-y-auto px-5 pb-24 pt-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      {/* Exit button — pinned to bottom center, always reachable. */}
      <button
        onClick={() => setFocusMode(false)}
        className="animate-fade-in fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary shadow-md transition-colors hover:bg-surface-subtle hover:text-text-primary"
        aria-label="Exit focus mode"
      >
        <X className="h-3 w-3" aria-hidden />
        Exit focus
        <kbd className="ml-0.5 rounded border border-border bg-surface-subtle px-1 py-0.5 text-[10px] font-medium text-text-muted">
          Esc
        </kbd>
      </button>
    </div>
  );
}

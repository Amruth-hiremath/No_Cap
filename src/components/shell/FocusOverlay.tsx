'use client';

import { useEffect } from 'react';
import { Play, Pause, X, Clock, Coffee } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { cn, formatTimer } from '@/lib/utils';
import type { FocusDuration } from '@/lib/types';
import type { ReactNode } from 'react';

const DURATIONS: { value: FocusDuration; label: string }[] = [
  { value: 5, label: '5 min' },
  { value: 12, label: '12 min' },
  { value: 25, label: '25 min' },
];

export function FocusOverlay({ children }: { children: ReactNode }) {
  const session = useStore((s) => s.focus_session);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const startFocusTimer = useStore((s) => s.startFocusTimer);
  const pauseFocusTimer = useStore((s) => s.pauseFocusTimer);
  const resumeFocusTimer = useStore((s) => s.resumeFocusTimer);
  const stopFocusTimer = useStore((s) => s.stopFocusTimer);

  const totalSeconds = session.duration * 60;
  const progress = totalSeconds > 0 ? 1 - session.remaining / totalSeconds : 0;

  useEffect(() => {
    // If timer reached 0, surface completion.
    if (session.remaining === 0 && session.duration > 0) {
      // Auto-stop running when it hits 0 — handled in tickFocusTimer
    }
  }, [session.remaining, session.duration]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-40 bg-grid">
      <div className="mx-auto flex h-full max-w-3xl flex-col px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-[0.12em]">Focus mode</span>
          </div>
          <button
            onClick={() => setFocusMode(false)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-subtle"
            aria-label="Exit focus mode"
          >
            <X className="h-3.5 w-3.5" />
            Exit
            <kbd className="ml-1 hidden rounded border border-border bg-surface-subtle px-1 py-0.5 text-[10px] sm:inline">
              Esc
            </kbd>
          </button>
        </div>

        {/* Timer */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative">
            <svg width={180} height={180} className="rotate-[-90deg]">
              <circle
                cx={90}
                cy={90}
                r={radius}
                stroke="var(--color-border)"
                strokeWidth={4}
                fill="none"
              />
              <circle
                cx={90}
                cy={90}
                r={radius}
                stroke="var(--color-accent)"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="tnum text-4xl font-bold text-text-primary">
                {formatTimer(session.remaining)}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-text-muted">
                {session.running ? 'in session' : session.remaining === 0 ? 'complete' : 'paused'}
              </div>
            </div>
          </div>

          {session.remaining === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 text-center">
              <Coffee className="h-6 w-6 text-success" />
              <p className="text-sm font-medium text-text-primary">Locked in. Take a breath.</p>
              <p className="text-xs text-text-muted">You can now mark this concept as understood.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => stopFocusTimer()}
              >
                Reset timer
              </Button>
            </div>
          ) : session.running ? (
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" size="sm" onClick={pauseFocusTimer}>
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
              <Button variant="ghost" size="sm" onClick={stopFocusTimer}>
                End session
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => startFocusTimer(d.value)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      session.duration === d.value && session.remaining > 0
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-subtle'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {session.remaining > 0 && (
                <Button variant="primary" size="sm" onClick={resumeFocusTimer}>
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[40vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Concept, MasteryState } from '@/lib/types';
import { MASTERY_STATE_META } from '@/lib/mastery';

interface ProgressMatrixProps {
  concepts: Concept[];
  states: Record<string, MasteryState>;
  showLegend?: boolean;
}

/**
 * Compact mastery matrix — one cell per concept, coloured by state.
 */
export function ProgressMatrix({ concepts, states, showLegend = true }: ProgressMatrixProps) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
        {concepts.map((c) => {
          const state = states[c.slug] ?? 'not_started';
          const meta = MASTERY_STATE_META[state];
          return (
            <Link
              key={c.slug}
              href={`/concepts/${c.slug}`}
              title={`${c.title} — ${meta.label}`}
              className={cn(
                'aspect-square rounded-md border border-border transition-all hover:scale-110',
                meta.bar
              )}
            />
          );
        })}
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-muted">
          {Object.entries(MASTERY_STATE_META).map(([state, meta]) => (
            <span key={state} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
              {meta.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface MasteryDimensionBarProps {
  label: string;
  value: number; // 0..1
}

export function MasteryDimensionBar({ label, value }: MasteryDimensionBarProps) {
  const pctVal = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="tnum text-text-muted">{pctVal}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pctVal >= 80 ? 'bg-success' : pctVal >= 50 ? 'bg-accent' : pctVal > 0 ? 'bg-warning' : 'bg-border'
          )}
          style={{ width: `${pctVal}%` }}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Activity, ArrowRight, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ScenarioBlock as ScenarioBlockType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScenarioCardProps {
  block: ScenarioBlockType;
  onSubmit: (score: number, response: unknown) => void;
}

export function ScenarioCard({ block, onSubmit }: ScenarioCardProps) {
  const { prompt, context, options, rationale, difficulty } = block.payload;
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const chosen = options.find((o) => o.id === selected) ?? null;
  const isCorrect = revealed && chosen?.correct === true;

  const handleReveal = () => {
    if (!selected) return;
    setRevealed(true);
    const opt = options.find((o) => o.id === selected);
    onSubmit(opt?.correct ? 1 : 0, { selected, options });
  };

  const handleReset = () => {
    setSelected(null);
    setRevealed(false);
  };

  return (
    <Surface variant="solid" className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent-3">
          <Activity className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            Try this
          </span>
        </div>
        {difficulty && <Badge variant="default">{difficulty}</Badge>}
      </div>

      {context && (
        <p className="mb-3 rounded-md bg-surface-subtle p-3 text-xs text-text-secondary">
          {context}
        </p>
      )}

      <p className="mb-4 text-[15px] font-medium leading-relaxed text-text-primary">
        {prompt}
      </p>

      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const isChosen = revealed && isSelected;
          return (
            <button
              key={opt.id}
              onClick={() => !revealed && setSelected(opt.id)}
              disabled={revealed}
              className={cn(
                'block w-full rounded-md border px-3 py-2.5 text-left text-sm transition-all',
                !revealed && isSelected && 'border-accent bg-accent-soft',
                !revealed && !isSelected && 'border-border hover:border-border-strong hover:bg-surface-subtle',
                isChosen && opt.correct && 'border-success bg-success-soft',
                isChosen && !opt.correct && 'border-danger bg-danger-soft',
                revealed && !isSelected && 'opacity-70'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium text-text-primary">{opt.text}</div>
                  {revealed && (
                    <div className="mt-1.5 text-xs text-text-secondary">
                      {opt.outcome}
                    </div>
                  )}
                </div>
                {isChosen && opt.correct && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                {isChosen && !opt.correct && <XCircle className="h-4 w-4 shrink-0 text-danger" />}
              </div>
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleReveal} disabled={!selected} size="sm">
            Predict outcome
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              'rounded-md p-3 text-sm',
              isCorrect ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            )}
          >
            {isCorrect
              ? 'Right call — you reasoned about the trade-off correctly.'
              : 'Different outcome — read the rationale below.'}
          </div>
          <div className="rounded-md bg-surface-subtle p-3 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Why: </span>
            {rationale}
          </div>
          <Button onClick={handleReset} variant="ghost" size="sm">
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}
    </Surface>
  );
}

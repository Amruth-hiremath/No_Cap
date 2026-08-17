'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { QuizBlock as QuizBlockType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuizCardProps {
  block: QuizBlockType;
  /** Optional title shown above the question. */
  eyebrow?: string;
  onSubmit: (score: number, response: unknown) => void;
}

type Shape = NonNullable<QuizBlockType['payload']['shape']>;

function normaliseOptions(
  options: string[] | { id: string; text: string; correct?: boolean; explanation?: string }[]
) {
  if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
    return (options as string[]).map((text, i) => ({
      id: String(i),
      text,
      explanation: undefined,
    }));
  }
  return options as { id: string; text: string; correct?: boolean; explanation?: string }[];
}

function correctIndices(block: QuizBlockType): number[] {
  const { options, answer_index, answer_indices } = block.payload;
  if (Array.isArray(answer_indices) && answer_indices.length > 0) {
    return answer_indices;
  }
  if (typeof answer_index === 'number') return [answer_index];
  if (Array.isArray(options)) {
    return options
      .map((o, i) => ({ o, i }))
      .filter((x) => typeof x.o === 'object' && (x.o as { correct?: boolean }).correct)
      .map((x) => x.i);
  }
  return [];
}

export function QuizBlock({ block, eyebrow, onSubmit }: QuizCardProps) {
  const shape: Shape = block.payload.shape ?? 'mcq';
  const isMulti = shape === 'multi-select';
  const options = normaliseOptions(block.payload.options);
  const correctIdxs = correctIndices(block);

  const [selected, setSelected] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  const toggle = (i: number) => {
    if (revealed) return;
    if (isMulti) {
      setSelected((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
      );
    } else {
      setSelected([i]);
    }
  };

  const handleReveal = () => {
    if (selected.length === 0) return;
    setRevealed(true);
    const correctSet = new Set(correctIdxs);
    const userSet = new Set(selected);
    const isCorrect =
      correctSet.size === userSet.size &&
      [...correctSet].every((x) => userSet.has(x));
    onSubmit(isCorrect ? 1 : 0, { selected, correct: correctIdxs });
  };

  const handleReset = () => {
    setSelected([]);
    setRevealed(false);
  };

  return (
    <Surface variant="solid" className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <Lightbulb className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            {eyebrow ?? 'Check yourself'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isMulti && <Badge variant="info">Multi-select</Badge>}
          {block.payload.difficulty && (
            <Badge variant="default">{block.payload.difficulty}</Badge>
          )}
        </div>
      </div>

      {block.payload.context && (
        <p className="mb-3 rounded-md bg-surface-subtle p-3 text-xs text-text-secondary">
          {block.payload.context}
        </p>
      )}

      <p className="mb-4 text-[15px] font-medium leading-relaxed text-text-primary">
        {block.payload.question}
      </p>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSelected = selected.includes(i);
          const isCorrect = correctIdxs.includes(i);
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isSelected && !isCorrect;

          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={revealed}
              className={cn(
                'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-all',
                !revealed && isSelected && 'border-accent bg-accent-soft',
                !revealed && !isSelected && 'border-border hover:border-border-strong hover:bg-surface-subtle',
                showCorrect && 'border-success bg-success-soft',
                showWrong && 'border-danger bg-danger-soft',
                revealed && !isSelected && !isCorrect && 'opacity-60'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] font-semibold',
                  isMulti ? 'rounded' : 'rounded-full',
                  !revealed && isSelected && 'border-accent bg-accent text-text-inverse',
                  !revealed && !isSelected && 'border-border-strong text-text-muted',
                  showCorrect && 'border-success bg-success text-text-inverse',
                  showWrong && 'border-danger bg-danger text-text-inverse'
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <div className="flex-1">
                <div className="text-text-primary">{opt.text}</div>
                {revealed && opt.explanation && (
                  <div className="mt-1 text-xs italic text-text-muted">
                    {opt.explanation}
                  </div>
                )}
              </div>
              {showCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
              {showWrong && <XCircle className="h-4 w-4 shrink-0 text-danger" />}
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {isMulti ? 'Select all that apply.' : 'Pick one answer.'}
          </p>
          <Button onClick={handleReveal} disabled={selected.length === 0} size="sm">
            Reveal
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(() => {
            const userSet = new Set(selected);
            const correctSet = new Set(correctIdxs);
            const isCorrect =
              userSet.size === correctSet.size &&
              [...correctSet].every((x) => userSet.has(x));
            return (
              <div
                className={cn(
                  'rounded-md p-3 text-sm',
                  isCorrect ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                )}
              >
                {isCorrect ? (
                  'Correct — your mental model is solid.'
                ) : (
                  'Not quite — re-read the rationale below.'
                )}
              </div>
            );
          })()}
          <div className="rounded-md bg-surface-subtle p-3 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Why: </span>
            {block.payload.rationale}
          </div>
          {block.payload.why_others && (
            <div className="rounded-md border border-border bg-surface p-3 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Why the others are wrong: </span>
              {block.payload.why_others}
            </div>
          )}
          <Button onClick={handleReset} variant="ghost" size="sm">
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}
    </Surface>
  );
}

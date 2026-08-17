'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, ArrowRight, Filter, RefreshCw, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { Surface, SectionHeader, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAllConcepts } from '@/lib/content';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Concept, QuizBlock } from '@/lib/types';

type FilterMode = 'all' | 'weak' | 'not_started' | 'in_progress';

export default function PracticePage() {
  const mastery = useStore((s) => s.mastery);
  const recordQuizAttempt = useStore((s) => s.recordQuizAttempt);
  const getMasteryState = useStore((s) => s.getMasteryState);
  const allConcepts = getAllConcepts();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [activeConcept, setActiveConcept] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  /* Collect all quiz blocks across concepts */
  const allQuizzes = useMemo(() => {
    const list: { concept: Concept; block: QuizBlock }[] = [];
    for (const c of allConcepts) {
      for (const b of c.blocks) {
        if (b.type === 'quiz') list.push({ concept: c, block: b as QuizBlock });
      }
    }
    return list;
  }, [allConcepts]);

  /* Filter quizzes */
  const filtered = useMemo(() => {
    return allQuizzes.filter(({ concept }) => {
      const state = getMasteryState(concept.slug);
      if (filter === 'weak') return state === 'review_due' || (state !== 'not_started' && state !== 'mastered');
      if (filter === 'not_started') return state === 'not_started';
      if (filter === 'in_progress') return ['exposed', 'understood', 'practiced', 'applied'].includes(state);
      return true;
    });
  }, [allQuizzes, filter, getMasteryState]);

  const activeQuizData = activeConcept && activeQuiz
    ? allQuizzes.find((q) => q.concept.slug === activeConcept && q.block.id === activeQuiz)
    : null;

  const handleReveal = () => {
    if (!activeQuizData || selected === null) return;
    const isCorrect = selected === activeQuizData.block.payload.answer_index;
    setRevealed(true);
    recordQuizAttempt(
      activeQuizData.concept.slug,
      activeQuizData.block.id,
      isCorrect ? 1 : 0,
      { selected }
    );
  };

  const handleNext = () => {
    setActiveConcept(null);
    setActiveQuiz(null);
    setSelected(null);
    setRevealed(false);
  };

  if (activeQuizData) {
    const payload = activeQuizData.block.payload;
    const isCorrect = selected === payload.answer_index;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/practice"
          onClick={handleNext}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to practice
        </Link>

        <div>
          <div className="flex items-center gap-2 text-accent">
            <Dumbbell className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
              {activeQuizData.concept.title}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">Quiz</h1>
          <AccentRule className="mt-2" />
        </div>

        <Surface variant="solid" className="p-6">
          <p className="mb-5 text-[15px] font-medium leading-relaxed text-text-primary">
            {payload.question}
          </p>

          <div className="space-y-2">
            {payload.options.map((opt, i) => {
              const optText = typeof opt === 'string' ? opt : opt.text;
              const isSelected = selected === i;
              const isAnswer = i === payload.answer_index;
              const showCorrect = revealed && isAnswer;
              const showWrong = revealed && isSelected && !isAnswer;
              return (
                <button
                  key={i}
                  onClick={() => !revealed && setSelected(i)}
                  disabled={revealed}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-all',
                    !revealed && isSelected && 'border-accent bg-accent-soft',
                    !revealed && !isSelected && 'border-border hover:border-border-strong',
                    showCorrect && 'border-success bg-success-soft',
                    showWrong && 'border-danger bg-danger-soft',
                    revealed && !isSelected && !isAnswer && 'opacity-50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                      !revealed && isSelected && 'border-accent bg-accent text-text-inverse',
                      !revealed && !isSelected && 'border-border-strong text-text-muted',
                      showCorrect && 'border-success bg-success text-text-inverse',
                      showWrong && 'border-danger bg-danger text-text-inverse'
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-text-secondary">{optText}</span>
                  {showCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {showWrong && <XCircle className="h-4 w-4 text-danger" />}
                </button>
              );
            })}
          </div>

          {!revealed ? (
            <div className="mt-5">
              <Button onClick={handleReveal} disabled={selected === null} variant="primary">
                Submit answer
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div
                className={cn(
                  'rounded-lg p-3 text-sm',
                  isCorrect ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                )}
              >
                {isCorrect ? 'Correct.' : 'Not quite.'}
              </div>
              <Surface variant="inset" className="p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
                  <Lightbulb className="h-3.5 w-3.5" /> Why
                </div>
                <p className="mt-1.5 text-sm text-text-secondary">{payload.rationale}</p>
              </Surface>
              <Button onClick={handleNext} variant="primary">
                Next question <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Practice</h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 text-sm text-text-secondary">
          Quiz yourself on any concept. Filter by mastery state to target weak areas.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        {([
          { key: 'all', label: 'All' },
          { key: 'weak', label: 'Weak / due' },
          { key: 'in_progress', label: 'In progress' },
          { key: 'not_started', label: 'Not started' },
        ] as { key: FilterMode; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-1.5 text-xs transition-colors',
              filter === f.key
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border text-text-secondary hover:border-border-strong'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Quiz list */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No quizzes match this filter."
          description="Try a different filter or browse the concept library."
          icon={<Dumbbell className="h-5 w-5" />}
          action={
            <Link href="/concepts" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              Browse concepts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(({ concept, block }) => {
            const state = getMasteryState(concept.slug);
            return (
              <button
                key={`${concept.slug}-${block.id}`}
                onClick={() => {
                  setActiveConcept(concept.slug);
                  setActiveQuiz(block.id);
                  setSelected(null);
                  setRevealed(false);
                }}
                className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-all hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <span className="font-medium uppercase tracking-wider">{concept.area}</span>
                      <span>·</span>
                      <span>{concept.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                      {block.payload.question}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {block.payload.difficulty && (
                        <Badge variant="default">{block.payload.difficulty}</Badge>
                      )}
                      <MasteryBadge state={state} />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

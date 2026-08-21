'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Brain, ArrowRight, CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { getConceptSummary } from '@/lib/content-lite';
import { formatDueLabel, formatInterval } from '@/lib/review-scheduler';
import { cn } from '@/lib/utils';
import { loadConcept } from '@/lib/content-lazy';
import type { AttemptRecord, ReviewItem, Concept } from '@/lib/types';

type Phase = 'recall' | 'revealed' | 'graded';

export default function ReviewPage() {
  const review_items = useStore((s) => s.review_items);
  const recordReview = useStore((s) => s.recordReview);
  const attempts = useStore((s) => s.attempts);

  // Snapshot the due queue once on mount. Avoids index-reset bugs when
  // dueReviews is derived from state and gets shorter after each answer.
  const [queueSnapshot, setQueueSnapshot] = useState<ReviewItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('recall');
  const [selected, setSelected] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState(0);


  useEffect(() => {
    const now = new Date();
    const due = Object.values(review_items).filter((r) => new Date(r.due_at) <= now);
    // Sort by due date ascending — most overdue first.
    due.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
    setQueueSnapshot(due);
  }, [review_items]);

  // Refresh the snapshot if items are added externally (e.g., via quiz).
  const dueCount = useMemo(() => {
    const now = new Date();
    return Object.values(review_items).filter((r) => new Date(r.due_at) <= now).length;
  }, [review_items]);

  const current = queueSnapshot[currentIdx];
  const [concept, setConcept] = useState<Concept | null>(null);

  useEffect(() => {
    let alive = true;

    if (!current) {
      setConcept(null);
      return;
    }

    void loadConcept(current.concept_slug).then((value) => {
      if (alive) setConcept(value);
    });

    return () => {
      alive = false;
    };
  }, [current?.concept_slug]);
  const quizBlock = concept?.blocks.find((b) => b.type === 'quiz');
  const isQuiz = quizBlock && quizBlock.type === 'quiz';

  const recentAttempts = attempts.slice(0, 5);

  // Completion state
  if (queueSnapshot.length > 0 && currentIdx >= queueSnapshot.length) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Review</h1>
          <AccentRule className="mt-3" />
        </header>
        <EmptyState
          title="Locked in."
          description={`You worked through ${completedCount} review${completedCount === 1 ? '' : 's'} this session. Your brain wants a rematch later — keep the streak alive.`}
          icon={<Brain className="h-5 w-5" />}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQueueSnapshot([]);
                setCurrentIdx(0);
                setCompletedCount(0);
              }}
            >
              Reset session
            </Button>
          }
        />
      </div>
    );
  }

  if (queueSnapshot.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Review</h1>
          <AccentRule className="mt-3" />
        </header>
        <EmptyState
          title="You're clear."
          description="Nothing needs review right now. Take today's dose or browse the library."
          icon={<Brain className="h-5 w-5" />}
          action={
            <Button variant="secondary" onClick={() => (window.location.href = '/daily')}>
              Continue today's dose
            </Button>
          }
        />
        {recentAttempts.length > 0 && (
          <Surface variant="solid" className="p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Recent attempts
            </div>
            <ul className="divide-y divide-border">
              {recentAttempts.map((a) => (
                <RecentAttemptRow key={a.id} attempt={a} />
              ))}
            </ul>
          </Surface>
        )}
      </div>
    );
  }

  if (!concept || !isQuiz) {
    // Concept has no quiz block — fall back to confidence-only review.
    if (!concept) {
      return (
        <EmptyState
          title="Concept missing"
          description="A review is scheduled for a concept that no longer exists in the content."
        />
      );
    }
    return (
      <ConfidenceOnlyReview
        conceptTitle={concept.title}
        conceptSlug={concept.slug}
        intervalDays={current.interval_days}
        onAnswer={(quality) => handleAnswer(quality)}
      />
    );
  }

  const handleAnswer = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    recordReview(current.concept_slug, quality);
    setCompletedCount((c) => c + 1);
    setPhase('recall');
    setSelected(null);
    setCurrentIdx((i) => i + 1);
  };

  const handleReveal = () => {
    setPhase('revealed');
  };

  const correctIdx = quizBlock.type === 'quiz' ? quizBlock.payload.answer_index : 0;
  const isCorrect = selected === correctIdx;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Review</h1>
          <Badge variant="warning">
            <RotateCcw className="h-3 w-3" />
            <span className="tnum">{Math.max(0, dueCount - completedCount)}</span> due
          </Badge>
        </div>
        <AccentRule className="mt-3" />
        <p className="mt-2 text-xs text-text-muted">
          Card <span className="tnum">{currentIdx + 1}</span> of{' '}
          <span className="tnum">{queueSnapshot.length}</span> · Due{' '}
          {formatDueLabel(current.due_at)}
        </p>
      </header>

      <Surface variant="liquid" className="p-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
          {concept.title}
        </div>
        <p className="mb-5 text-lg font-medium leading-relaxed text-text-primary">
          {quizBlock.type === 'quiz' && quizBlock.payload.question}
        </p>

        {/* Options — interactive. Recall phase shows them as buttons. */}
        <div className="space-y-2">
          {quizBlock.type === 'quiz' &&
            quizBlock.payload.options.map((opt, i) => {
              const isSelected = selected === i;
              const isAnswer = i === correctIdx;
              const showCorrect = phase !== 'recall' && isAnswer;
              const showWrong = phase !== 'recall' && isSelected && !isAnswer;
              return (
                <button
                  key={i}
                  onClick={() => phase === 'recall' && setSelected(i)}
                  disabled={phase !== 'recall'}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-all',
                    phase === 'recall' && isSelected && 'border-accent bg-accent-soft',
                    phase === 'recall' && !isSelected && 'border-border hover:border-border-strong hover:bg-surface-subtle',
                    showCorrect && 'border-success bg-success-soft',
                    showWrong && 'border-danger bg-danger-soft',
                    phase !== 'recall' && !isSelected && !isAnswer && 'opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                      phase === 'recall' && isSelected && 'border-accent bg-accent text-text-inverse',
                      phase === 'recall' && !isSelected && 'border-border-strong text-text-muted',
                      showCorrect && 'border-success bg-success text-text-inverse',
                      showWrong && 'border-danger bg-danger text-text-inverse'
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-text-primary">{opt as string}</span>
                  {showCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                  {showWrong && <XCircle className="h-4 w-4 shrink-0 text-danger" />}
                </button>
              );
            })}
        </div>

        {phase === 'recall' ? (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Recall first — pick before you reveal.
            </p>
            <Button onClick={handleReveal} disabled={selected === null} size="sm">
              Reveal answer
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div
              className={cn(
                'rounded-md p-3 text-sm',
                isCorrect ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              )}
            >
              {isCorrect ? 'Correct — solid recall.' : 'Not quite — schedule a sooner retry.'}
            </div>
            <div className="rounded-md bg-surface-subtle p-3 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Why: </span>
              {quizBlock.type === 'quiz' && quizBlock.payload.rationale}
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Confidence:
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="secondary" size="sm" onClick={() => handleAnswer(1)} className="!border-danger !bg-danger-soft !text-danger">
                  Forgot
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleAnswer(2)} className="!border-warning !bg-warning-soft !text-warning">
                  Hard
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleAnswer(3)} className="!border-accent !bg-accent-soft !text-accent">
                  Good
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleAnswer(5)} className="!border-success !bg-success-soft !text-success">
                  Easy
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <RotateCw className="h-3 w-3" />
              Current interval: <span className="tnum">{formatInterval(current.interval_days)}</span>
              {current.prior_interval_days != null && (
                <>
                  {' '}(was <span className="tnum">{formatInterval(current.prior_interval_days)}</span>)
                </>
              )}
            </div>
          </div>
        )}
      </Surface>

      {recentAttempts.length > 0 && (
        <Surface variant="solid" className="p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Recent attempts
          </div>
          <ul className="divide-y divide-border">
            {recentAttempts.map((a) => (
              <RecentAttemptRow key={a.id} attempt={a} />
            ))}
          </ul>
        </Surface>
      )}
    </div>
  );
}

function ConfidenceOnlyReview({
  conceptTitle,
  conceptSlug,
  intervalDays,
  onAnswer,
}: {
  conceptTitle: string;
  conceptSlug: string;
  intervalDays: number;
  onAnswer: (q: 0 | 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Review</h1>
        <AccentRule className="mt-3" />
      </header>
      <Surface variant="liquid" className="p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
          {conceptTitle}
        </div>
        <p className="mt-2 text-lg font-medium text-text-primary">
          Recall what you know about {conceptTitle}. How confident are you?
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Current interval: <span className="tnum">{formatInterval(intervalDays)}</span>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="secondary" size="sm" onClick={() => onAnswer(1)} className="!border-danger !bg-danger-soft !text-danger">
            Forgot
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onAnswer(2)} className="!border-warning !bg-warning-soft !text-warning">
            Hard
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onAnswer(3)} className="!border-accent !bg-accent-soft !text-accent">
            Good
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onAnswer(5)} className="!border-success !bg-success-soft !text-success">
            Easy
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-text-muted">
          This concept has no quiz authored yet — confidence grading only.
        </p>
      </Surface>
    </div>
  );
}

function RecentAttemptRow({ attempt }: { attempt: AttemptRecord }) {
  const pct = Math.round(attempt.score * 100);
  const concept = getConceptSummary(attempt.concept_slug);
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span
        className={cn(
          'tnum rounded px-1.5 py-0.5 text-xs font-semibold',
          attempt.score >= 0.8
            ? 'bg-success-soft text-success'
            : attempt.score >= 0.5
              ? 'bg-warning-soft text-warning'
              : 'bg-danger-soft text-danger'
        )}
      >
        {pct}%
      </span>
      <span className="flex-1 text-text-secondary">
        {concept?.title ?? attempt.concept_slug}
      </span>
      <span className="text-xs text-text-muted">
        {new Date(attempt.created_at).toLocaleDateString()}
      </span>
    </li>
  );
}

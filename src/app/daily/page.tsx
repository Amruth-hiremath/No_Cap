'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  Sparkles,
  Brain,
  Eye,
  Activity,
  Lightbulb,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuizBlock } from '@/components/concept/QuizCard';
import { ScenarioCard } from '@/components/concept/ScenarioCard';
import { LessonBlockRenderer } from '@/components/concept/LessonRenderer';
import { useStore } from '@/lib/store';
import { loadConcept } from '@/lib/content-lazy';
import { pickDailyDoseSummary } from '@/lib/content-lite';
import { buildDailyDoseForConcept } from '@/lib/daily-session-client';
import { cn } from '@/lib/utils';
import type { DailyDoseStep, MasteryState, Concept, LessonBlock, QuizBlock as QuizBlockType, ScenarioBlock as ScenarioBlockType } from '@/lib/types';

const STEP_META: Record<
  DailyDoseStep['kind'],
  { icon: typeof Brain; label: string; noun: string }
> = {
  concept_intro: { icon: Sparkles, label: 'Concept', noun: 'intro' },
  mental_model: { icon: Brain, label: 'Mental model', noun: 'understand' },
  visual: { icon: Eye, label: 'Visual', noun: 'see it' },
  prediction: { icon: Activity, label: 'Try this', noun: 'predict' },
  quiz: { icon: Lightbulb, label: 'Quiz', noun: 'check' },
  recall: { icon: RotateCcw, label: 'Recall', noun: 'recall' },
};

export default function DailyDosePage() {
  const router = useRouter();
  const mastery = useStore((s) => s.mastery);
  const review_items = useStore((s) => s.review_items);
  const startConcept = useStore((s) => s.startConcept);
  const markUnderstood = useStore((s) => s.markConceptUnderstood);
  const recordQuiz = useStore((s) => s.recordQuizAttempt);
  const recordScenario = useStore((s) => s.recordScenarioAttempt);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const getMasteryState = useStore((s) => s.getMasteryState);

  const events = useStore((s) => s.events);
  const selectedSummary = useMemo(() => pickDailyDoseSummary(mastery, review_items, events.map((e) => ({ concept_slug: e.concept_slug, created_at: e.created_at }))), [mastery, review_items, events]);
  const [concept, setConcept] = useState<Concept | null>(null);
  useEffect(() => { let alive = true; if (!selectedSummary) { setConcept(null); return; } void loadConcept(selectedSummary.slug).then((value) => { if (alive) setConcept(value); }); return () => { alive = false; }; }, [selectedSummary?.slug]);
  const session = useMemo(() => {
    if (!concept || !selectedSummary) return { date: '', concept_slug: '', steps: [] as DailyDoseStep[] };
    const record = mastery[concept.slug];
    const review = Boolean(review_items[concept.slug] && new Date(review_items[concept.slug].due_at) <= new Date());
    const weak = Boolean(record && ((record.recall_score < 0.6) || (record.apply_score < 0.5)));
    return buildDailyDoseForConcept(concept, weak, review, events.map((e) => ({ concept_slug: e.concept_slug, created_at: e.created_at })));
  }, [concept, selectedSummary, mastery, review_items, events]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // Record exposure on mount
  useEffect(() => {
    if (concept) startConcept(concept.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept?.slug]);

  if (!concept) {
    return (
      <EmptyState
        title="No daily dose available"
        description="There's no content to study yet. Check the concept library."
        icon={<Sparkles className="h-5 w-5" />}
        action={<Link href="/concepts"><Button variant="secondary">Open library</Button></Link>}
      />
    );
  }

  const step = session.steps[activeIdx];
  const isLast = activeIdx === session.steps.length - 1;
  const progress = (completed.size / session.steps.length) * 100;

  const advance = () => {
    if (!step) return;
    setCompleted((prev) => new Set(prev).add(step.id));
    if (!isLast) {
      setActiveIdx(activeIdx + 1);
    }
  };

  const goBack = () => {
    if (activeIdx > 0) setActiveIdx(activeIdx - 1);
  };

  const complete = () => {
    if (step) setCompleted((prev) => new Set(prev).add(step.id));
    markUnderstood(concept.slug);
    router.push('/');
  };

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Today
        </Link>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
          <Clock className="h-3 w-3" />
          {concept.estimated_minutes} min · Daily Dose
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          {concept.title}
        </h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 text-sm text-text-secondary">{concept.summary}</p>
      </header>

      {/* Stepper */}
      <Surface variant="inset" className="p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {session.steps.map((s, i) => {
            const meta = STEP_META[s.kind];
            const Icon = meta.icon;
            const done = completed.has(s.id);
            const active = i === activeIdx;
            return (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : done
                      ? 'border-success bg-success-soft text-success'
                      : 'border-border bg-surface text-text-muted hover:bg-surface-subtle'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span className="font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-subtle">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
          <span>Step {activeIdx + 1} of {session.steps.length}</span>
          <button
            onClick={() => setFocusMode(true)}
            className="rounded px-2 py-0.5 text-accent hover:bg-surface-subtle"
          >
            Enter focus mode →
          </button>
        </div>
      </Surface>

      {/* Step content */}
      <div className="animate-fade-in-up" key={step?.id}>
        <StepContent
          step={step}
          concept={concept}
          masteryState={getMasteryState(concept.slug)}
          onQuiz={(score, ref_id) => recordQuiz(concept.slug, ref_id, score, {})}
          onScenario={(score, ref_id) => recordScenario(concept.slug, ref_id, score, {})}
          onComplete={advance}
        />
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={goBack} disabled={activeIdx === 0}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        {isLast ? (
          <Button size="sm" onClick={complete}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete dose
          </Button>
        ) : (
          <Button size="sm" onClick={advance}>
            Next step
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface StepContentProps {
  step?: DailyDoseStep;
  concept: Concept;
  masteryState: MasteryState;
  onQuiz: (score: number, ref_id: string) => void;
  onScenario: (score: number, ref_id: string) => void;
  onComplete: () => void;
}

function StepContent({
  step,
  concept,
  onQuiz,
  onScenario,
  onComplete,
  masteryState,
}: StepContentProps) {
  if (!step) return null;

  switch (step.kind) {
    case 'concept_intro': {
      return (
        <div className="space-y-4">
          <Surface variant="solid" className="p-5">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                Concept intro
              </span>
              <MasteryBadge state={masteryState} />
            </div>
            <h2 className="mt-2 text-xl font-bold text-text-primary">{concept.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{concept.summary}</p>
            {concept.why_it_matters && (
              <p className="mt-3 rounded-md bg-surface-subtle p-3 text-sm text-text-secondary">
                {concept.why_it_matters}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="default">{concept.area}</Badge>
              <Badge variant="default">{concept.difficulty}</Badge>
              <Badge variant="default">{concept.estimated_minutes} min</Badge>
            </div>
          </Surface>
          <Button variant="primary" onClick={onComplete}>
            Begin session
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    case 'mental_model':
    case 'visual': {
      const block = (step.block_ref
        ? concept.blocks.find((b) => b.id === step.block_ref)
        : concept.blocks.find((b) =>
            step.kind === 'mental_model'
              ? b.type === 'prose'
              : b.type === 'mermaid' || b.type === 'flow'
          )) as LessonBlock | undefined;
      if (!block) {
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">This step has no content. Skip ahead.</p>
            <Button variant="primary" onClick={onComplete}>Continue <ArrowRight className="h-4 w-4" /></Button>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <Surface variant="solid" className="p-5">
            <LessonBlockRenderer block={block} />
          </Surface>
          <Button variant="primary" onClick={onComplete}>
            Got it
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    case 'prediction': {
      const block = (step.block_ref
        ? concept.blocks.find((b) => b.id === step.block_ref && b.type === 'scenario')
        : concept.blocks.find((b) => b.type === 'scenario')) as ScenarioBlockType | undefined;
      if (!block) {
        // Fallback: use the first quiz block as a "prediction" prompt.
        const quiz = concept.blocks.find((b) => b.type === 'quiz') as QuizBlockType | undefined;
        if (quiz) {
          return (
            <QuizBlock
              block={quiz}
              eyebrow="Predict & check"
              onSubmit={(score) => {
                onQuiz(score, quiz.id);
                onComplete();
              }}
            />
          );
        }
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">No prediction activity. Continue.</p>
            <Button variant="primary" onClick={onComplete}>Continue</Button>
          </div>
        );
      }
      return (
        <ScenarioCard
          block={block}
          onSubmit={(score) => {
            onScenario(score, block.id);
            onComplete();
          }}
        />
      );
    }
    case 'quiz': {
      const block = (step.block_ref
        ? concept.blocks.find((b) => b.id === step.block_ref && b.type === 'quiz')
        : concept.blocks.find((b) => b.type === 'quiz')) as QuizBlockType | undefined;
      if (!block) {
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">No quiz. Continue.</p>
            <Button variant="primary" onClick={onComplete}>Continue</Button>
          </div>
        );
      }
      return (
        <QuizBlock
          block={block}
          onSubmit={(score) => {
            onQuiz(score, block.id);
            onComplete();
          }}
        />
      );
    }
    case 'recall': {
      return (
        <Surface variant="solid" className="p-5">
          <div className="flex items-center gap-2 text-accent-2">
            <RotateCcw className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Recall</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-text-primary">
            Without scrolling up — in your own words, what is {concept.title}?
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            You don&apos;t need to type anything. The act of attempting the recall
            is what cements the concept. Say it out loud, then mark it done.
          </p>
          {concept.interview_prompts.length > 0 && (
            <div className="mt-4 rounded-md bg-surface-subtle p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Reflection prompt
              </p>
              <p className="mt-1 text-sm text-text-secondary">{concept.interview_prompts[0]}</p>
            </div>
          )}
          <Button className="mt-4" variant="primary" onClick={onComplete}>
            Mark recalled
            <Check className="h-4 w-4" />
          </Button>
        </Surface>
      );
    }
  }
}

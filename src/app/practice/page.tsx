'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, ArrowRight, Filter, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAllConceptSummaries } from '@/lib/content-lite';
import { loadConcept } from '@/lib/content-lazy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Concept, QuizBlock } from '@/lib/types';

type FilterMode = 'all' | 'weak' | 'not_started' | 'in_progress';
type PracticeEntry = { slug: string; title: string; area: string; difficulty: string; quizCount: number; };

export default function PracticePage() {
  const mastery = useStore((s) => s.mastery);
  const recordQuizAttempt = useStore((s) => s.recordQuizAttempt);
  const getMasteryState = useStore((s) => s.getMasteryState);
  const allConcepts = getAllConceptSummaries();
  const practiceEntries = useMemo<PracticeEntry[]>(() => allConcepts
    .filter((c) => (c.quiz_count ?? 0) > 0)
    .map((c) => ({ slug: c.slug, title: c.title, area: c.area, difficulty: c.difficulty, quizCount: c.quiz_count ?? 0 })), [allConcepts]);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [activeQuizData, setActiveQuizData] = useState<{ concept: Concept; block: QuizBlock } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);

  const filtered = useMemo(() => practiceEntries.filter(({ slug }) => {
    const state = getMasteryState(slug);
    if (filter === 'weak') return state === 'review_due' || (state !== 'not_started' && state !== 'mastered');
    if (filter === 'not_started') return state === 'not_started';
    if (filter === 'in_progress') return ['exposed','understood','practiced','applied'].includes(state);
    return true;
  }), [practiceEntries, filter, mastery, getMasteryState]);

  const handleOpenQuiz = async (entry: PracticeEntry) => {
    const questionKey = `${entry.slug}:random`;
    setLoadingQuizId(questionKey);
    try {
      const concept = await loadConcept(entry.slug);
      const quizzes = concept?.blocks.filter((b): b is QuizBlock => b.type === 'quiz') ?? [];
      if (concept && quizzes.length) {
        const block = quizzes[Math.floor(Math.random() * quizzes.length)];
        setActiveQuizData({ concept, block });
        setSelected(null);
        setRevealed(false);
      }
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleReveal = () => {
    if (!activeQuizData || selected === null) return;
    const isCorrect = selected === activeQuizData.block.payload.answer_index;
    setRevealed(true);
    recordQuizAttempt(activeQuizData.concept.slug, activeQuizData.block.id, isCorrect ? 1 : 0, { selected });
  };

  const handleNext = () => {
    setActiveQuizData(null);
    setSelected(null);
    setRevealed(false);
  };

  if (activeQuizData) {
    const payload = activeQuizData.block.payload;
    const isCorrect = selected === payload.answer_index;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button onClick={handleNext} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"><ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to practice</button>
        <div>
          <div className="flex items-center gap-2 text-accent"><Dumbbell className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{activeQuizData.concept.title}</span></div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">Quiz</h1><AccentRule className="mt-2" />
        </div>
        <Surface variant="solid" className="p-6">
          <p className="mb-5 text-[15px] font-medium leading-relaxed text-text-primary">{payload.question}</p>
          <div className="space-y-2">
            {payload.options.map((opt, i) => {
              const optText = typeof opt === 'string' ? opt : opt.text;
              const isSelected = selected === i; const isAnswer = i === payload.answer_index;
              const showCorrect = revealed && isAnswer; const showWrong = revealed && isSelected && !isAnswer;
              return <button key={i} onClick={() => !revealed && setSelected(i)} disabled={revealed} className={cn('flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-all', !revealed && isSelected && 'border-accent bg-accent-soft', !revealed && !isSelected && 'border-border hover:border-border-strong', showCorrect && 'border-success bg-success-soft', showWrong && 'border-danger bg-danger-soft', revealed && !isSelected && !isAnswer && 'opacity-50')}><span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium', !revealed && isSelected && 'border-accent bg-accent text-text-inverse', !revealed && !isSelected && 'border-border-strong text-text-muted', showCorrect && 'border-success bg-success text-text-inverse', showWrong && 'border-danger bg-danger text-text-inverse')}>{String.fromCharCode(65+i)}</span><span className="flex-1 text-text-secondary">{optText}</span>{showCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}{showWrong && <XCircle className="h-4 w-4 text-danger" />}</button>;
            })}
          </div>
          {!revealed ? <div className="mt-5"><Button onClick={handleReveal} disabled={selected === null}>Submit answer</Button></div> : <div className="mt-5 space-y-3"><div className={cn('rounded-lg p-3 text-sm', isCorrect ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{isCorrect ? 'Correct.' : 'Not quite.'}</div><Surface variant="inset" className="p-4"><div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent"><Lightbulb className="h-3.5 w-3.5" /> Why</div><p className="mt-1.5 text-sm text-text-secondary">{payload.rationale}</p></Surface><Button onClick={handleNext}>Next question <ArrowRight className="h-4 w-4" /></Button></div>}
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-text-primary">Practice</h1><AccentRule className="mt-3" /><p className="mt-3 text-sm text-text-secondary">Quiz yourself without loading the entire curriculum into the browser. Only compact concept metadata is loaded here; the full lesson bundle is fetched only for the concept you open.</p></div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1"><Filter className="h-3.5 w-3.5 shrink-0 text-text-muted" />{([{key:'all',label:'All'},{key:'weak',label:'Weak / due'},{key:'in_progress',label:'In progress'},{key:'not_started',label:'Not started'}] as {key:FilterMode;label:string}[]).map((f)=><button key={f.key} onClick={()=>setFilter(f.key)} className={cn('shrink-0 rounded-lg border px-3 py-1.5 text-xs transition-colors',filter===f.key?'border-accent bg-accent-soft text-accent':'border-border text-text-secondary hover:border-border-strong')}>{f.label}</button>)}</div>
      {filtered.length===0 ? <EmptyState title="No quizzes match this filter." description="Try a different filter or browse the concept library." icon={<Dumbbell className="h-5 w-5" />} action={<Link href="/concepts" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Browse concepts <ArrowRight className="h-3.5 w-3.5" /></Link>} /> : <div className="grid gap-2 md:grid-cols-2">
        {filtered.map((entry)=>{ const state=getMasteryState(entry.slug); const busy=loadingQuizId===`${entry.slug}:random`; return <button key={entry.slug} onClick={()=>void handleOpenQuiz(entry)} disabled={busy} className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-all hover:border-border-strong hover:-translate-y-px disabled:opacity-60"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[11px] text-text-muted"><span className="font-medium uppercase tracking-wider">{entry.area}</span><span>·</span><span className="truncate">{entry.title}</span></div><p className="mt-1 line-clamp-2 text-sm text-text-secondary">{entry.quizCount} question{entry.quizCount === 1 ? '' : 's'} available. Open a question and full lesson data will be loaded only for that concept.</p><div className="mt-2 flex items-center gap-2"><Badge variant="default">{entry.difficulty}</Badge><MasteryBadge state={state} /></div></div><ArrowRight className={cn('h-4 w-4 shrink-0 text-text-muted',busy&&'animate-pulse')} /></div></button>; })}
      </div>}
    </div>
  );
}

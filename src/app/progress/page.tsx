'use client';

import Link from 'next/link';
import { TrendingUp, Brain, Target, Flame, Activity, ArrowRight, Clock } from 'lucide-react';
import { Surface, SectionHeader, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { getAllConceptSummaries, getConceptSummary } from '@/lib/content-lite';
import { useStore } from '@/lib/store';
import { MASTERY_STATE_META, computeMasteryScore } from '@/lib/mastery';
import { formatDueLabel } from '@/lib/review-scheduler';
import { cn } from '@/lib/utils';
import type { MasteryRecord, MasteryState } from '@/lib/types';

const DIMENSIONS: { key: keyof MasteryRecord; label: string }[] = [
  { key: 'learn_score', label: 'Learn' },
  { key: 'recall_score', label: 'Recall' },
  { key: 'apply_score', label: 'Apply' },
  { key: 'explain_score', label: 'Explain' },
  { key: 'interview_score', label: 'Interview' },
];

export default function ProgressPage() {
  const mastery = useStore((s) => s.mastery);
  const attempts = useStore((s) => s.attempts);
  const events = useStore((s) => s.events);
  const streak = useStore((s) => s.streak);
  const reviewItems = useStore((s) => s.review_items);
  const allConcepts = getAllConceptSummaries();

  const masteryValues = Object.values(mastery);
  const masteredCount = masteryValues.filter((m) => m.state === 'mastered').length;
  const inProgressCount = masteryValues.filter((m) =>
    ['exposed', 'understood', 'practiced', 'applied'].includes(m.state)
  ).length;
  const reviewDueCount = masteryValues.filter((m) => m.state === 'review_due').length;

  const quizAttempts = attempts.filter((a) => a.type === 'quiz');
  const avgScore =
    quizAttempts.length > 0
      ? quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length
      : 0;

  /* Group by area for mastery-by-area */
  const byArea = allConcepts.reduce(
    (acc, c) => {
      if (!acc[c.area]) acc[c.area] = [];
      acc[c.area].push(c);
      return acc;
    },
    {} as Record<string, typeof allConcepts>
  );

  /* Weak areas: concepts with mastery score < 0.5 but > 0 (started but not solid) */
  const weakConcepts = masteryValues
    .filter((m) => {
      const score = computeMasteryScore(m);
      return score > 0 && score < 0.55;
    })
    .sort((a, b) => computeMasteryScore(a) - computeMasteryScore(b))
    .slice(0, 5);

  /* Review load: due today, due this week, mastered */
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueToday = Object.values(reviewItems).filter(
    (r) => new Date(r.due_at) <= now
  ).length;
  const dueWeek = Object.values(reviewItems).filter(
    (r) => {
      const d = new Date(r.due_at);
      return d > now && d <= weekAhead;
    }
  ).length;

  /* 7-day momentum: count events per day for last 7 days */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const momentum = Array.from({ length: 7 }).map((_, i) => {
    const dayStart = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const count = events.filter((e) => {
      const ed = new Date(e.created_at);
      return ed >= dayStart && ed < dayEnd;
    }).length;
    return { day: dayStart, count };
  });
  const maxMomentum = Math.max(...momentum.map((m) => m.count), 1);
  const activeDays = momentum.filter((m) => m.count > 0).length;

  const isEmpty = masteryValues.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Progress</h1>
        <AccentRule className="mt-3" />
      </div>

      {isEmpty ? (
        <EmptyState
          title="Your mastery map starts here."
          description="Complete your first concept to light it up. Every quiz, review, and scenario feeds the matrix."
          icon={<Brain className="h-5 w-5" />}
          action={
            <Link href="/concepts" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              Browse concepts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Surface variant="solid" className="p-4">
              <div className="flex items-center gap-2 text-success">
                <Brain className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Mastered</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="tnum text-2xl font-bold text-text-primary">{masteredCount}</span>
                <span className="text-xs text-text-muted">/ {allConcepts.length}</span>
              </div>
            </Surface>

            <Surface variant="solid" className="p-4">
              <div className="flex items-center gap-2 text-accent">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">In progress</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="tnum text-2xl font-bold text-text-primary">{inProgressCount}</span>
                <span className="text-xs text-text-muted">concepts</span>
              </div>
            </Surface>

            <Surface variant="solid" className="p-4">
              <div className="flex items-center gap-2 text-warning">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Review due</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="tnum text-2xl font-bold text-text-primary">{reviewDueCount}</span>
                <span className="text-xs text-text-muted">concepts</span>
              </div>
            </Surface>

            <Surface variant="solid" className="p-4">
              <div className="flex items-center gap-2 text-accent">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Avg quiz</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="tnum text-2xl font-bold text-text-primary">{Math.round(avgScore * 100)}</span>
                <span className="text-xs text-text-muted">%</span>
              </div>
            </Surface>
          </div>

          {/* 7-day momentum */}
          <Surface variant="solid" className="p-5">
            <SectionHeader
              eyebrow="Momentum"
              title="7-day activity"
              description={`${activeDays} active day${activeDays === 1 ? '' : 's'} this week`}
              icon={<Flame className="h-3.5 w-3.5" />}
            />
            <div className="mt-5 flex items-end justify-between gap-1.5">
              {momentum.map((m, i) => {
                const h = m.count === 0 ? 4 : Math.max(8, (m.count / maxMomentum) * 64);
                const isToday = i === momentum.length - 1;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="tnum text-[10px] text-text-muted">
                      {m.count > 0 ? m.count : ''}
                    </span>
                    <div
                      className={cn(
                        'w-full rounded-sm transition-all',
                        m.count > 0 ? 'bg-accent' : 'bg-border',
                        isToday && m.count > 0 && 'edge-glow'
                      )}
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] text-text-faint">
                      {m.day.toLocaleDateString('en', { weekday: 'narrow' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-6 border-t border-border pt-3">
              <div>
                <div className="tnum text-lg font-bold text-text-primary">{streak.current}</div>
                <div className="text-[11px] text-text-muted">current streak</div>
              </div>
              <div>
                <div className="tnum text-lg font-bold text-text-primary">{streak.longest}</div>
                <div className="text-[11px] text-text-muted">longest</div>
              </div>
              <div>
                <div className="tnum text-lg font-bold text-text-primary">{streak.recovery_tokens}</div>
                <div className="text-[11px] text-text-muted">recovery tokens</div>
              </div>
            </div>
          </Surface>

          {/* Mastery by area */}
          <Surface variant="solid" className="p-5">
            <SectionHeader
              eyebrow="Mastery by area"
              title="Where you're strong, where you're not"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <div className="mt-4 space-y-3">
              {Object.entries(byArea).map(([area, concepts]) => {
                const areaMastery = concepts.map((c) => mastery[c.slug]);
                const valid = areaMastery.filter(Boolean);
                const avg =
                  valid.length > 0
                    ? valid.reduce((s, m) => s + computeMasteryScore(m), 0) / valid.length
                    : 0;
                const pct = Math.round(avg * 100);
                return (
                  <div key={area} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 truncate text-xs font-medium text-text-secondary">
                      {area}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-accent' : 'bg-warning'
                        )}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                    <span className="tnum w-10 text-right text-xs text-text-muted">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Mastery matrix — per-concept × per-dimension */}
          <Surface variant="solid" className="p-5">
            <SectionHeader
              eyebrow="Mastery matrix"
              title="5-dimension breakdown"
              description="Learn · Recall · Apply · Explain · Interview"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="py-2 pr-3 text-left font-medium">Concept</th>
                    {DIMENSIONS.map((d) => (
                      <th key={d.key} className="px-1.5 py-2 text-center font-medium">{d.label}</th>
                    ))}
                    <th className="px-2 py-2 text-right font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {allConcepts.map((c) => {
                    const m = mastery[c.slug];
                    const state: MasteryState = m?.state ?? 'not_started';
                    const meta = MASTERY_STATE_META[state];
                    return (
                      <tr key={c.slug} className="border-b border-border-faint">
                        <td className="py-2 pr-3">
                          <Link
                            href={`/concepts/${c.slug}`}
                            className="text-text-primary hover:text-accent hover:underline"
                          >
                            {c.title}
                          </Link>
                        </td>
                        {DIMENSIONS.map((d) => {
                          const val = (m?.[d.key] as number) ?? 0;
                          return (
                            <td key={d.key} className="px-1.5 py-2 text-center">
                              <div
                                className={cn(
                                  'mx-auto h-1.5 w-10 rounded-full',
                                  val >= 0.7 ? 'bg-success' : val >= 0.4 ? 'bg-accent' : val > 0 ? 'bg-warning' : 'bg-border'
                                )}
                                title={`${d.label}: ${Math.round(val * 100)}%`}
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-right">
                          <span className={cn('inline-flex items-center gap-1 text-[11px]', meta.text)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>

          {/* Weak areas */}
          {weakConcepts.length > 0 && (
            <Surface variant="solid" className="p-5">
              <SectionHeader
                eyebrow="Weak areas"
                title="Concepts that need work"
                description="Sorted by lowest mastery score. Start here."
                icon={<Target className="h-3.5 w-3.5" />}
              />
              <div className="mt-4 space-y-2">
                {weakConcepts.map((m) => {
                  const c = getConceptSummary(m.concept_slug);
                  if (!c) return null;
                  const score = computeMasteryScore(m);
                  return (
                    <Link
                      key={m.concept_slug}
                      href={`/concepts/${m.concept_slug}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 hover:border-border-strong"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{c.title}</div>
                        <div className="text-xs text-text-muted">{c.area}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-inset">
                          <div className="h-full bg-warning" style={{ width: `${Math.max(3, Math.round(score * 100))}%` }} />
                        </div>
                        <span className="tnum text-xs text-text-muted">{Math.round(score * 100)}%</span>
                        <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Surface>
          )}

          {/* Review load */}
          <Surface variant="solid" className="p-5">
            <SectionHeader
              eyebrow="Review load"
              title="Upcoming schedule"
              icon={<Clock className="h-3.5 w-3.5" />}
            />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="tnum text-2xl font-bold text-warning">{dueToday}</div>
                <div className="text-[11px] text-text-muted">due today</div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="tnum text-2xl font-bold text-accent">{dueWeek}</div>
                <div className="text-[11px] text-text-muted">due this week</div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="tnum text-2xl font-bold text-success">{masteredCount}</div>
                <div className="text-[11px] text-text-muted">mastered</div>
              </div>
            </div>
            {dueToday > 0 && (
              <Link
                href="/review"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                Review now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </Surface>
        </>
      )}
    </div>
  );
}

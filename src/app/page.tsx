'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  RotateCcw,
  BookOpen,
  Sparkles,
  Clock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { getAllConceptSummaries, getConceptSummary, pickDailyDoseSummary, getLiteRecommendations } from '@/lib/content-lite';
import { formatDueLabel } from '@/lib/review-scheduler';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const streak = useStore((s) => s.streak);
  const lastVisited = useStore((s) => s.last_visited_concept);
  const mastery = useStore((s) => s.mastery);
  const review_items = useStore((s) => s.review_items);
  const dueReviews = useMemo(() => {
    const now = Date.now();
    return Object.values(review_items).filter((r) => Date.parse(r.due_at) <= now);
  }, [review_items]);
  const events = useStore((s) => s.events);
  const startConcept = useStore((s) => s.startConcept);

  const eventsLite = useMemo(
    () =>
      events.flatMap((e) =>
        e.concept_slug
          ? [{ concept_slug: e.concept_slug, created_at: e.created_at }]
          : []
      ),
    [events]
  );
  const conceptCount = getAllConceptSummaries().length;
  const todaysConcept = pickDailyDoseSummary(mastery, review_items, eventsLite);
  const recommendations = getLiteRecommendations(mastery, review_items, lastVisited, 1);

  const reviewConcepts = dueReviews
    .slice(0, 3)
    .map((r) => getConceptSummary(r.concept_slug))
    .filter(Boolean);

  const continueConcept = lastVisited ? getConceptSummary(lastVisited) : null;

  // 7-day momentum, computed only when the event history changes.
  const momentum = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const days: { date: string; count: number }[] = [];
    const today = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today - i * 86_400_000);
      const key = formatter.format(d);
      let count = 0;
      for (const event of events) {
        if (formatter.format(new Date(event.created_at)) === key) count += 1;
      }
      days.push({ date: key, count });
    }
    return days;
  }, [events]);
  const maxMomentum = Math.max(1, ...momentum.map((m) => m.count));

  const masteredCount = Object.values(mastery).filter((m) => m.state === 'mastered').length;
  const inProgressCount = Object.values(mastery).filter((m) =>
    ['exposed', 'understood', 'practiced', 'applied', 'review_due'].includes(m.state)
  ).length;

  return (
    <div className="space-y-8">
      <header className="home-hero">
        <div className="home-hero__brand">
          <div className="home-hero__mark"><img src="/brand/no-cap-mark.png" alt="" /></div>
          <div>
            <div className="home-hero__eyebrow">SYSTEM DESIGN WORKSPACE</div>
            <div className="home-hero__micro"><span>NO CAP</span><span className="home-hero__dot" /> <span>{conceptCount} concepts</span></div>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            <Sparkles className="h-3 w-3 text-accent" />
            Today
          </div>
          <h1 className="mt-2 max-w-3xl text-[clamp(2.1rem,5vw,3.5rem)] font-black leading-[0.98] tracking-[-0.045em] text-text-primary">
            Learn the primitives. Design the system. Break the bottlenecks.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary md:text-[15px]">
            Learn one idea deeply, visualize how it behaves, stress-test the trade-offs, then carry the insight into your next system design.
          </p>
        </div>
      </header>

      {/* Today's learning session (Liquid Glass — only one on screen) */}
      {todaysConcept && (
        <Surface variant="liquid" className="p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="accent">
                  <Clock className="h-3 w-3" />
                  <span className="tnum">{todaysConcept.estimated_minutes}</span> MIN
                </Badge>
                <Badge variant="default">{todaysConcept.difficulty}</Badge>
                <Badge variant="info">{todaysConcept.area}</Badge>
                {mounted && (
                  <MasteryBadge
                    state={useStore.getState().getMasteryState(todaysConcept.slug)}
                  />
                )}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Today&apos;s Dose
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
                {todaysConcept.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                {todaysConcept.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/daily">
                  <Button
                    size="lg"
                    onClick={() => startConcept(todaysConcept.slug)}
                  >
                    Start today&apos;s dose
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/concepts/${todaysConcept.slug}`}>
                  <Button variant="ghost" size="lg">
                    Read concept
                  </Button>
                </Link>
              </div>
            </div>
            <div className="shrink-0">
              <SessionStepperMini steps={['Recall', 'Learn', 'Visualize', 'Practice', 'Recall'].map((title) => ({ title }))} />
            </div>
          </div>
        </Surface>
      )}

      {/* Two-column section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Review */}
        <Surface variant="solid" className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-warning">
              <RotateCcw className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Review due</span>
            </div>
            {dueReviews.length > 0 && (
              <Link href="/review">
                <Button size="sm" variant="secondary">Open</Button>
              </Link>
            )}
          </div>
          {dueReviews.length === 0 ? (
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="tnum text-3xl font-bold text-text-primary">0</span>
                <span className="text-sm text-text-muted">due</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                You&apos;re clear. Nothing needs review right now.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Next up: start today&apos;s dose.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="tnum text-3xl font-bold text-text-primary">{dueReviews.length}</span>
                <span className="text-sm text-text-muted">
                  {dueReviews.length === 1 ? 'concept' : 'concepts'}
                </span>
              </div>
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {reviewConcepts.map((c) => {
                  if (!c) return null;
                  const review = dueReviews.find((r) => r.concept_slug === c.slug)!;
                  return (
                    <Link
                      key={c.slug}
                      href="/review"
                      className="flex items-center justify-between rounded px-1 py-1 text-sm text-text-secondary hover:bg-surface-subtle"
                    >
                      <span className="truncate">{c.title}</span>
                      <span className="tnum ml-2 text-xs text-warning">
                        {formatDueLabel(review.due_at)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </Surface>

        {/* Continue */}
        {continueConcept ? (
          <Surface variant="solid" className="p-5">
            <div className="flex items-center gap-2 text-text-secondary">
              <BookOpen className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Continue</span>
            </div>
            <p className="mt-2 text-base font-semibold text-text-primary">
              {continueConcept.title}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {continueConcept.area} · {continueConcept.estimated_minutes} min
              {mounted && lastVisited && ' · scroll position saved'}
            </p>
            <Link
              href={`/concepts/${continueConcept.slug}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Resume <ArrowRight className="h-3 w-3" />
            </Link>
          </Surface>
        ) : (
          <Surface variant="solid" className="p-5">
            <div className="flex items-center gap-2 text-accent">
              <Flame className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Streak</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="tnum text-3xl font-bold text-text-primary">{streak.current}</span>
              <span className="text-sm text-text-muted">days</span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Longest: {streak.longest} · Recovery tokens: {streak.recovery_tokens}
            </p>
          </Surface>
        )}
      </div>

      {/* Recommendation + Progress strip */}
      <div className="grid gap-4 md:grid-cols-3">
        <Surface variant="solid" className="p-5 md:col-span-2">
          <div className="flex items-center gap-2 text-accent-3">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
              Recommended next
            </span>
          </div>
          {recommendations.length > 0 ? (
            (() => {
              const rec = recommendations[0];
              return (
                <div className="mt-2">
                  <p className="text-base font-semibold text-text-primary">
                    {rec.concept.title}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{rec.reason}</p>
                  <Link
                    href={`/concepts/${rec.concept.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                  >
                    {rec.concept.title} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })()
          ) : (
            <p className="mt-2 text-sm text-text-muted">
              No recommendations yet — start your first concept.
            </p>
          )}
        </Surface>

        <Surface variant="solid" className="p-5">
          <div className="flex items-center gap-2 text-accent-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Progress</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tnum text-3xl font-bold text-text-primary">{masteredCount}</span>
            <span className="text-sm text-text-muted">/ {conceptCount} mastered</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {inProgressCount} in progress
          </p>
          <Link
            href="/progress"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            View progress <ArrowRight className="h-3 w-3" />
          </Link>
        </Surface>
      </div>

      {/* Weekly momentum */}
      <Surface variant="solid" className="p-5">
        <div className="mb-3 flex items-center gap-2 text-text-secondary">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            Weekly momentum
          </span>
          <span className="text-[11px] text-text-muted">last 7 days</span>
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {momentum.map((day, i) => {
            const heightPct = day.count === 0 ? 8 : (day.count / maxMomentum) * 100;
            const isToday = i === momentum.length - 1;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm ${day.count > 0 ? 'bg-accent' : 'bg-border'} ${isToday ? 'ring-1 ring-accent ring-offset-1 ring-offset-surface' : ''}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${day.date}: ${day.count} event${day.count === 1 ? '' : 's'}`}
                />
                <span className="text-[10px] text-text-faint">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}
                </span>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}

function SessionStepperMini({ steps }: { steps: { title: string }[] }) {
  return (
    <div className="hidden md:block">
      <ol className="space-y-1.5 border-l border-border pl-3">
        {steps.map((s, i) => (
          <li key={`${s.title}-${i}`} className="flex items-center gap-2 text-[11px]">
            <span className="tnum w-4 text-text-muted">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-text-secondary">{s.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

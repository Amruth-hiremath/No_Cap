'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Map, Compass, Grid3x3, Target, ArrowRight, Sparkles } from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RoadmapGraph } from '@/components/roadmap/RoadmapGraph';
import { getTracks } from '@/lib/curriculum';
import { getAllConceptSummaries, getConceptSummary, getLiteRecommendations } from '@/lib/content-lite';
import { useStore } from '@/lib/store';
import { MASTERY_STATE_META } from '@/lib/mastery';
import { cn } from '@/lib/utils';
import type { MasteryState } from '@/lib/types';

type Mode = 'guided' | 'explore' | 'mastery' | 'interview';

const modes: { id: Mode; label: string; icon: typeof Map; hint: string }[] = [
  { id: 'guided', label: 'Guided', icon: Compass, hint: 'Next concept + why' },
  { id: 'explore', label: 'Explore', icon: Grid3x3, hint: 'Dependency graph' },
  { id: 'mastery', label: 'Mastery', icon: Map, hint: 'Heat-map' },
  { id: 'interview', label: 'Interview', icon: Target, hint: 'Filter by interview relevance' },
];

export default function RoadmapPage() {
  const [mode, setMode] = useState<Mode>('guided');
  const tracks = getTracks();
  const allConcepts = getAllConceptSummaries();
  const mastery = useStore((s) => s.mastery);
  const review_items = useStore((s) => s.review_items);
  const last_visited_concept = useStore((s) => s.last_visited_concept);
  const getMasteryState = useStore((s) => s.getMasteryState);

  const states: Record<string, MasteryState> = {};
  for (const c of allConcepts) states[c.slug] = getMasteryState(c.slug);

  // Guard: if the curriculum returned no tracks, bail out with a friendly
  // empty state instead of crashing on `tracks[0].phases` below.
  if (tracks.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Roadmap</h1>
          <AccentRule className="mt-3" />
          <p className="mt-3 max-w-2xl text-sm text-text-secondary">
            The roadmap is a map, not a checklist. Switch modes to find what to learn next,
            explore the dependency graph, see mastery, or focus on interview-relevant concepts.
          </p>
        </header>
        <EmptyState
          title="No curriculum loaded"
          description="The roadmap will appear here once concept tracks are available. Try reloading the page, or check back later."
          icon={<Map className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Roadmap</h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          The roadmap is a map, not a checklist. Switch modes to find what to learn next,
          explore the dependency graph, see mastery, or focus on interview-relevant concepts.
        </p>
      </header>

      <Surface variant="solid" className="p-2">
        <div className="flex flex-wrap gap-1">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                )}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{m.label}</span>
                <span className="hidden text-[11px] text-text-muted sm:inline">
                  · {m.hint}
                </span>
              </button>
            );
          })}
        </div>
      </Surface>

      {mode === 'guided' && (
        <GuidedView
          mastery={mastery}
          review_items={review_items}
          last_visited_concept={last_visited_concept}
        />
      )}

      {mode === 'explore' && (
        <div className="space-y-3">
          <Surface variant="solid" className="p-4">
            <p className="text-xs text-text-muted">
              Each box is a concept. Solid arrows are prerequisites (you should learn the source first).
              Dotted arrows are related concepts. Click any node to open its lesson.
            </p>
          </Surface>
          <RoadmapGraph concepts={allConcepts} states={states} />
          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border" /> Not started
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" /> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> Mastered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" /> Review due
            </span>
          </div>
        </div>
      )}

      {mode === 'mastery' && (
        <div className="space-y-3">
          {tracks[0].phases.map((phase) => {
            const phaseConcepts = phase.concepts
              .map((slug) => allConcepts.find((c) => c.slug === slug))
              .filter((x): x is NonNullable<typeof x> => Boolean(x));
            return (
              <Surface key={phase.slug} variant="solid" className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="tnum text-xs text-text-muted">
                        {String(phase.order).padStart(2, '0')}
                      </span>
                      <h2 className="text-base font-semibold text-text-primary">
                        {phase.title}
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{phase.description}</p>
                  </div>
                  <Badge variant="default">
                    {phaseConcepts.length} concept{phaseConcepts.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                <ul className="divide-y divide-border">
                  {phaseConcepts.map((c) => {
                    const state = states[c.slug];
                    const meta = MASTERY_STATE_META[state];
                    return (
                      <li key={c.slug}>
                        <Link
                          prefetch={false} href={`/concepts/${c.slug}`}
                          className="flex items-center gap-3 py-2 hover:bg-surface-subtle"
                        >
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-text-primary">{c.title}</div>
                            <div className="text-[11px] text-text-muted">
                              {c.estimated_minutes} min · {c.difficulty}
                            </div>
                          </div>
                          <MasteryBadge state={state} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Surface>
            );
          })}
        </div>
      )}

      {mode === 'interview' && (
        <div className="space-y-3">
          <Surface variant="solid" className="p-4">
            <p className="text-xs text-text-muted">
              {allConcepts.filter((c) => (c.interview_count ?? 0) > 0).length} concepts
              with interview prompts. Use these for mock interview practice.
            </p>
          </Surface>
          {tracks[0].phases.map((phase) => {
            const phaseConcepts = phase.concepts
              .map((slug) => allConcepts.find((c) => c.slug === slug))
              .filter((x): x is NonNullable<typeof x> => Boolean(x))
              .filter((c) => (c.interview_count ?? 0) > 0);
            if (phaseConcepts.length === 0) return null;
            return (
              <Surface key={phase.slug} variant="solid" className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="tnum text-xs text-text-muted">
                    {String(phase.order).padStart(2, '0')}
                  </span>
                  <h2 className="text-base font-semibold text-text-primary">{phase.title}</h2>
                </div>
                <ul className="divide-y divide-border">
                  {phaseConcepts.map((c) => (
                    <li key={c.slug}>
                      <Link
                        prefetch={false} href={`/concepts/${c.slug}`}
                        className="flex items-start gap-3 py-2.5 hover:bg-surface-subtle"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{c.title}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                            {c.summary}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-text-muted">
                            <Badge variant="accent">{c.interview_count ?? 0} prompts</Badge>
                            <Badge variant="default">{c.difficulty}</Badge>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GuidedView({
  mastery,
  review_items,
  last_visited_concept,
}: {
  mastery: ReturnType<typeof useStore.getState>['mastery'];
  review_items: ReturnType<typeof useStore.getState>['review_items'];
  last_visited_concept: string | null;
}) {
  const recs = getLiteRecommendations(mastery, review_items, last_visited_concept, 3);
  if (recs.length === 0) {
    return (
      <EmptyState
        title="Roadmap complete"
        description="You've worked through every concept. Keep reviewing to maintain mastery."
        icon={<Sparkles className="h-5 w-5" />}
      />
    );
  }
  const primary = recs[0];
  const others = recs.slice(1);
  const prereqs = primary.concept.prerequisites
    .map((p) => getConceptSummary(p))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="space-y-4">
      <Surface variant="liquid" className="p-6">
        <div className="flex items-center gap-2 text-accent">
          <Compass className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
            Next up
          </span>
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          {primary.concept.title}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{primary.reason}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="default">{primary.concept.area}</Badge>
          <Badge variant="default">{primary.concept.estimated_minutes} min</Badge>
          <Badge variant="default">{primary.concept.difficulty}</Badge>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href={`/concepts/${primary.concept.slug}`}>
            <Button>
              Start concept
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/daily">
            <Button variant="ghost">Take as Daily Dose</Button>
          </Link>
        </div>
      </Surface>

      {prereqs.length > 0 && (
        <Surface variant="solid" className="p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Prerequisites
          </div>
          <ul className="space-y-1.5">
            {prereqs.map((p) => {
              const m = mastery[p.slug];
              const ready = m && m.learn_score >= 0.7;
              return (
                <li key={p.slug} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      ready ? 'bg-success' : 'bg-warning'
                    )}
                  />
                  <Link
                    href={`/concepts/${p.slug}`}
                    className="text-text-primary hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span className="text-xs text-text-muted">
                    {ready ? '✓ ready' : 'review suggested'}
                  </span>
                </li>
              );
            })}
          </ul>
        </Surface>
      )}

      {others.length > 0 && (
        <Surface variant="solid" className="p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Or pick from
          </div>
          <ul className="divide-y divide-border">
            {others.map((rec, index) => (
              <li key={`${rec.concept.slug}-${index}`}>
                <Link
                  href={`/concepts/${rec.concept.slug}`}
                  className="flex items-center gap-3 py-2 hover:bg-surface-subtle"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {rec.concept.title}
                    </div>
                    <div className="text-[11px] text-text-muted">{rec.reason}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Lock, BookOpen } from 'lucide-react';
import { Surface, SectionHeader } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { getAllConcepts } from '@/lib/content';
import { useStore } from '@/lib/store';
import { MASTERY_STATE_META, computeMasteryScore } from '@/lib/mastery';
import { cn, formatDuration } from '@/lib/utils';
import type { Concept, MasteryState } from '@/lib/types';

type MasteryFilter = 'all' | 'not_started' | 'in_progress' | 'review_due' | 'mastered';

export default function ConceptsPage() {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string>('all');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('all');
  const all = getAllConcepts();
  const mastery = useStore((s) => s.mastery);
  const getMasteryState = useStore((s) => s.getMasteryState);

  const areas = Array.from(new Set(all.map((c) => c.area))).sort();

  const filtered = all.filter((c) => {
    if (area !== 'all' && c.area !== area) return false;
    if (query) {
      const q = query.toLowerCase();
      const matchesTitle = c.title.toLowerCase().includes(q);
      const matchesArea = c.area.toLowerCase().includes(q);
      const matchesSlug = c.slug.includes(q);
      const matchesSummary = (c.summary ?? '').toLowerCase().includes(q);
      if (!matchesTitle && !matchesArea && !matchesSlug && !matchesSummary) return false;
    }
    if (masteryFilter !== 'all') {
      const state = getMasteryState(c.slug);
      if (masteryFilter === 'not_started' && state !== 'not_started') return false;
      if (masteryFilter === 'in_progress' && !['exposed', 'understood', 'practiced', 'applied'].includes(state)) return false;
      if (masteryFilter === 'review_due' && state !== 'review_due') return false;
      if (masteryFilter === 'mastered' && state !== 'mastered') return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Concepts</h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Build the mental models behind real systems. {all.length} seed concepts
          across {areas.length} areas.
        </p>
      </header>

      <Surface variant="solid" className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, area, or summary..."
              aria-label="Search concepts"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none"
              aria-label="Filter by area"
            >
              <option value="all">All areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={masteryFilter}
              onChange={(e) => setMasteryFilter(e.target.value as MasteryFilter)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none"
              aria-label="Filter by mastery"
            >
              <option value="all">All states</option>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="review_due">Review due</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>
      </Surface>

      {/* List (not a card grid) */}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {filtered.map((c) => {
          const state = getMasteryState(c.slug);
          const meta = MASTERY_STATE_META[state];
          const record = mastery[c.slug];
          const score = record ? computeMasteryScore(record) : 0;
          const blocked = c.prerequisites.some((p) => {
            const m = mastery[p];
            return !m || m.learn_score < 0.7;
          });
          return (
            <li key={c.slug}>
              <Link
                href={`/concepts/${c.slug}`}
                className="block px-4 py-3.5 transition-colors hover:bg-surface-subtle md:px-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                      <span className="rounded bg-surface-subtle px-1.5 py-0.5 font-medium">{c.area}</span>
                      <span>{formatDuration(c.estimated_minutes)}</span>
                      <span>·</span>
                      <span>{c.difficulty}</span>
                      {c.phase && (
                        <>
                          <span>·</span>
                          <span>{c.phase}</span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1 text-[15px] font-semibold text-text-primary">
                      {c.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
                      {c.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <MasteryBadge state={state} />
                      {blocked && state === 'not_started' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                          <Lock className="h-3 w-3" />
                          Has unlearned prereqs
                        </span>
                      )}
                      {c.prerequisites.length > 0 && (
                        <span className="text-[11px] text-text-faint">
                          {c.prerequisites.length} prereq{c.prerequisites.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {record && score > 0 && (
                      <div className="hidden text-right sm:block">
                        <div className="tnum text-sm font-semibold text-text-primary">
                          {Math.round(score * 100)}%
                        </div>
                        <div className="text-[10px] text-text-muted">mastery</div>
                      </div>
                    )}
                    <ArrowRight className="h-4 w-4 text-text-muted" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-text-muted">
            <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-50" />
            No concepts match your filters.
          </li>
        )}
      </ul>
    </div>
  );
}

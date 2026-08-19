'use client';

import Link from 'next/link';
import {
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  X,
  RotateCcw,
} from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { getConcept } from '@/lib/content';
import { MASTERY_STATE_META } from '@/lib/mastery';
import type { Concept, MasteryState, MasteryRecord } from '@/lib/types';

interface ConfusingItem {
  slug: string;
  concept: Concept;
  state: MasteryState;
  masteryRecord?: MasteryRecord;
}

export default function ConfusingPage() {
  const hydrated = useHydrated();
  const confusing = useStore((s) => s.confusing_concepts);
  const toggleConfusing = useStore((s) => s.toggleConfusing);
  const getMasteryState = useStore((s) => s.getMasteryState);
  const mastery = useStore((s) => s.mastery);

  const items: ConfusingItem[] = hydrated
    ? confusing
        .map<ConfusingItem | null>((slug) => {
          const concept = getConcept(slug);
          if (!concept) return null;
          return {
            slug,
            concept,
            state: getMasteryState(slug),
            masteryRecord: mastery[slug],
          };
        })
        .filter((x): x is ConfusingItem => x !== null)
        .sort((a, b) => a.concept.title.localeCompare(b.concept.title))
    : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
        <Link
          href="/library"
          className="inline-flex items-center gap-1 hover:text-text-primary"
        >
          <ArrowLeft className="h-3 w-3" />
          Library
        </Link>
        <span className="text-text-faint">/</span>
        <span className="text-text-secondary">Confusing</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Confusing concepts
        </h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Concepts that haven’t clicked yet. Mark a concept as confusing from its page — they show up here for a focused re-study pass.
        </p>
      </div>

      {!hydrated ? (
        <ConfusingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing confusing right now."
          description="Mark a concept as confusing from its page to surface it here for a focused re-study."
          icon={<HelpCircle className="h-5 w-5" />}
          action={
            <Link
              href="/concepts"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Browse concepts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="px-1 text-[11px] text-text-muted">
            {items.length} concept{items.length === 1 ? '' : 's'} marked confusing
          </div>
          {items.map(({ slug, concept, state }) => {
            const meta = MASTERY_STATE_META[state];
            return (
              <Surface key={slug} variant="solid" className="group p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                      <span className="truncate">{concept.area}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-text-primary">
                      <Link
                        href={`/concepts/${slug}`}
                        className="hover:text-accent hover:underline"
                      >
                        {concept.title}
                      </Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                      {concept.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <MasteryBadge state={state} />
                      <Badge variant="default">
                        {concept.estimated_minutes} min
                      </Badge>
                      <Badge variant="default" className="capitalize">
                        {concept.difficulty}
                      </Badge>
                      {state === 'review_due' && (
                        <span className={meta.text}>
                          <span className="text-[11px]">due for review</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      href={`/concepts/${slug}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                    >
                      Re-study <ExternalLink className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => toggleConfusing(slug)}
                      className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-danger"
                      title="Remove from confusing"
                    >
                      <X className="h-3 w-3" />
                      Remove from confusing
                    </button>
                  </div>
                </div>
              </Surface>
            );
          })}

          {/* Re-study callout */}
          <Surface variant="frosted" className="mt-4 flex items-start gap-3 p-4">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Re-study tip:</span>{' '}
              Re-read each concept slowly, then test yourself with a quiz or scenario
              to see if it clicks. Mastery state will update automatically.
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────── */
function ConfusingSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <Surface key={i} variant="solid" className="p-4">
          <div className="h-3 w-1/4 animate-pulse rounded bg-surface-inset" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-surface-inset" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-inset" />
          <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-surface-inset" />
        </Surface>
      ))}
    </div>
  );
}

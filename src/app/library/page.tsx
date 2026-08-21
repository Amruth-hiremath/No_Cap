'use client';

import Link from 'next/link';
import {
  StickyNote,
  Highlighter,
  Bookmark as BookmarkIcon,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Layers,
} from 'lucide-react';
import { Surface, SectionHeader, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { getConceptSummary } from '@/lib/content-lite';
import { cn } from '@/lib/utils';
import type { Note, Highlight, Bookmark } from '@/lib/types';

/* ── Relative time helper ─────────────────────────────────────── */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

/* Color → tailwind class for the dot */
const HIGHLIGHT_COLOR_DOT: Record<Highlight['color'], string> = {
  amber: 'bg-warning',
  green: 'bg-success',
  rust: 'bg-accent-3',
  info: 'bg-info',
};

/* ── Recently saved mixed feed ────────────────────────────────── */
type SavedItem =
  | { kind: 'note'; ts: string; data: Note }
  | { kind: 'highlight'; ts: string; data: Highlight }
  | { kind: 'bookmark'; ts: string; data: Bookmark };

export default function LibraryPage() {
  const hydrated = useHydrated();
  const notes = useStore((s) => s.notes);
  const highlights = useStore((s) => s.highlights);
  const bookmarks = useStore((s) => s.bookmarks);
  const confusing = useStore((s) => s.confusing_concepts);
  const lastVisitedConcept = useStore((s) => s.last_visited_concept);
  const mastery = useStore((s) => s.mastery);
  const getMasteryState = useStore((s) => s.getMasteryState);

  /* Until hydrated, render deterministic skeleton values to avoid
     hydration mismatches. */
  const noteCount = hydrated ? notes.length : 0;
  const highlightCount = hydrated ? highlights.length : 0;
  const bookmarkCount = hydrated ? bookmarks.length : 0;
  const confusingCount = hydrated ? confusing.length : 0;

  /* Build mixed recently-saved feed */
  const recentlySaved: SavedItem[] = hydrated
    ? [
        ...notes.map<SavedItem>((n) => ({ kind: 'note', ts: n.updated_at ?? n.created_at, data: n })),
        ...highlights.map<SavedItem>((h) => ({ kind: 'highlight', ts: h.created_at, data: h })),
        ...bookmarks.map<SavedItem>((b) => ({ kind: 'bookmark', ts: b.created_at, data: b })),
      ]
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 5)
    : [];

  /* Recently studied — last visited concept first, then mastery records
     sorted by updated_at desc. */
  const recentConceptSlugs: string[] = (() => {
    if (!hydrated) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    if (lastVisitedConcept) {
      seen.add(lastVisitedConcept);
      out.push(lastVisitedConcept);
    }
    const sorted = Object.values(mastery)
      .filter((m) => m.state !== 'not_started')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    for (const m of sorted) {
      if (seen.has(m.concept_slug)) continue;
      seen.add(m.concept_slug);
      out.push(m.concept_slug);
      if (out.length >= 5) break;
    }
    return out;
  })();

  const summaryCards = [
    {
      href: '/library/notes',
      label: 'Notes',
      count: noteCount,
      icon: StickyNote,
      tone: 'text-accent',
      hint: 'Your takeaways',
    },
    {
      href: '/library/highlights',
      label: 'Highlights',
      count: highlightCount,
      icon: Highlighter,
      tone: 'text-warning',
      hint: 'Passages you marked',
    },
    {
      href: '/library/bookmarks',
      label: 'Bookmarks',
      count: bookmarkCount,
      icon: BookmarkIcon,
      tone: 'text-info',
      hint: 'Concepts you saved',
    },
    {
      href: '/library/confusing',
      label: 'Confusing',
      count: confusingCount,
      icon: HelpCircle,
      tone: 'text-danger',
      hint: 'Needs another pass',
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
          <BookmarkIcon className="h-3 w-3 text-accent" />
          Library
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          Your reading shelf
        </h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Notes, highlights, bookmarks, and the concepts that haven’t clicked yet.
          Everything you’ve saved, in one place.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Surface
                variant="solid"
                className="flex h-full items-start justify-between p-4 transition-all group-hover:border-border-strong"
              >
                <div>
                  <div className={cn('flex items-center gap-1.5', card.tone)}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                      {card.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="tnum text-2xl font-bold text-text-primary">
                      {hydrated ? card.count : '—'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-text-muted">{card.hint}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-text-secondary" />
              </Surface>
            </Link>
          );
        })}
      </div>

      {/* Recently saved */}
      <section>
        <SectionHeader
          eyebrow="Recent"
          title="Recently saved"
          description="Your last 5 notes, highlights, and bookmarks"
          icon={<Clock className="h-3.5 w-3.5" />}
          action={
            <Link
              href="/notes"
              className="hidden items-center gap-1 text-xs font-medium text-accent hover:underline sm:inline-flex"
            >
              All notes <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        {hydrated && recentlySaved.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing saved yet."
              description="Select text in a concept to highlight or add a note. Bookmark a concept to revisit it later."
              icon={<StickyNote className="h-5 w-5" />}
              action={
                <Link
                  href="/concepts"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  Browse concepts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border-faint rounded-xl border border-border bg-surface">
            {recentlySaved.map((item) => (
              <SavedRow key={`${item.kind}-${item.data.id}`} item={item} />
            ))}
            {!hydrated &&
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-surface-inset" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-1/3 rounded bg-surface-inset" />
                    <div className="h-2.5 w-2/3 rounded bg-surface-inset" />
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Recently studied concepts */}
      <section>
        <SectionHeader
          eyebrow="Continue"
          title="Recently studied"
          description="Concepts you’ve opened or started"
          icon={<Layers className="h-3.5 w-3.5" />}
        />
        {hydrated && recentConceptSlugs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No concepts opened yet."
              description="Pick your first concept from the roadmap or concepts list."
              icon={<Layers className="h-5 w-5" />}
              action={
                <Link
                  href="/concepts"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  Browse concepts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {recentConceptSlugs.map((slug) => {
              const concept = getConceptSummary(slug);
              if (!concept) return null;
              const state = hydrated ? getMasteryState(slug) : 'not_started';
              return (
                <Link
                  key={slug}
                  href={`/concepts/${slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-all hover:border-border-strong"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary group-hover:text-accent">
                      {concept.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-text-muted">
                      {concept.area} · {concept.estimated_minutes} min
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <MasteryBadge state={state} />
                    <ArrowRight className="h-3.5 w-3.5 text-text-faint transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                  </div>
                </Link>
              );
            })}
            {!hydrated &&
              [0, 1].map((i) => (
                <div
                  key={i}
                  className="h-[68px] animate-pulse rounded-lg border border-border bg-surface"
                />
              ))}
          </div>
        )}
      </section>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-[11px] text-text-muted">
        <span>Everything here lives in this browser. No cloud sync in v0.1.</span>
        <Badge variant="default">Local mode</Badge>
      </div>
    </div>
  );
}

/* ── Saved row (mixed note/highlight/bookmark) ─────────────────── */
function SavedRow({ item }: { item: SavedItem }) {
  const { kind, data, ts } = item;
  const concept = getConceptSummary(data.concept_slug);

  if (kind === 'note') {
    const n = data;
    return (
      <Link
        href={`/concepts/${n.concept_slug}${n.block_id ? `#${n.block_id}` : ''}`}
        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle"
      >
        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-text-primary">
              {n.title || 'Untitled note'}
            </span>
            <span className="shrink-0 text-[11px] text-text-muted">{timeAgo(ts)}</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
            {n.body || '(empty)'}
          </p>
          <span className="mt-0.5 text-[11px] text-text-muted">
            {concept?.title ?? data.concept_slug}
          </span>
        </div>
      </Link>
    );
  }

  if (kind === 'highlight') {
    const h = data;
    return (
      <Link
        href={`/concepts/${h.concept_slug}`}
        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle"
      >
        <span
          className={cn(
            'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
            HIGHLIGHT_COLOR_DOT[h.color]
          )}
          aria-label={`highlight color: ${h.color}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-text-primary">
              {concept?.title ?? h.concept_slug}
            </span>
            <span className="shrink-0 text-[11px] text-text-muted">{timeAgo(ts)}</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
            &ldquo;{h.selected_text}&rdquo;
          </p>
        </div>
      </Link>
    );
  }

  // bookmark
  const b = data;
  return (
    <Link
      href={`/concepts/${b.concept_slug}${b.block_id ? `#${b.block_id}` : ''}`}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle"
    >
      <BookmarkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-text-primary">
            {b.label}
          </span>
          <span className="shrink-0 text-[11px] text-text-muted">{timeAgo(ts)}</span>
        </div>
        <span className="text-[11px] text-text-muted">
          {concept?.title ?? b.concept_slug}
        </span>
      </div>
    </Link>
  );
}

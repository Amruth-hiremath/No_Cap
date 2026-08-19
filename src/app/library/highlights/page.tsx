'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Highlighter,
  Search,
  Trash2,
  ExternalLink,
  X,
  ArrowLeft,
  Filter,
  Hash,
} from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { getConcept } from '@/lib/content';
import { cn } from '@/lib/utils';
import type { Highlight } from '@/lib/types';

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

/* Color → tailwind classes for the dot + soft background */
const HIGHLIGHT_COLOR: Record<
  Highlight['color'],
  { dot: string; bg: string; text: string; label: string }
> = {
  amber: { dot: 'bg-warning', bg: 'bg-warning-soft', text: 'text-warning', label: 'Amber' },
  green: { dot: 'bg-success', bg: 'bg-success-soft', text: 'text-success', label: 'Green' },
  rust: { dot: 'bg-accent-3', bg: 'bg-accent-soft', text: 'text-accent-3', label: 'Rust' },
  info: { dot: 'bg-info', bg: 'bg-info-soft', text: 'text-info', label: 'Info' },
};

type ColorFilter = 'all' | Highlight['color'];

/* ── Color → hex (for inline border styles) ───────────────────── */
function colorHex(color: Highlight['color']): string {
  if (typeof document === 'undefined') {
    // Fallbacks — these match the @theme tokens roughly.
    switch (color) {
      case 'amber': return '#92400e';
      case 'green': return '#166534';
      case 'rust': return '#7c2d12';
      case 'info': return '#0f766e';
    }
  }
  const cssVarMap: Record<Highlight['color'], string> = {
    amber: '--color-warning',
    green: '--color-success',
    rust: '--color-accent-3',
    info: '--color-info',
  };
  const root = document.documentElement;
  const v = getComputedStyle(root).getPropertyValue(cssVarMap[color]).trim();
  return v || '#92400e';
}

export default function HighlightsPage() {
  const hydrated = useHydrated();
  const highlights = useStore((s) => s.highlights);
  const removeHighlight = useStore((s) => s.removeHighlight);

  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [conceptFilter, setConceptFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  /* Unique concept slugs present in highlights — for the concept filter */
  const conceptOptions = useMemo(() => {
    if (!hydrated) return [] as { slug: string; title: string; count: number }[];
    const counts = new Map<string, number>();
    for (const h of highlights) {
      counts.set(h.concept_slug, (counts.get(h.concept_slug) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([slug, count]) => {
        const c = getConcept(slug);
        return { slug, title: c?.title ?? slug, count };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [hydrated, highlights]);

  /* Color counts */
  const colorCounts = useMemo(() => {
    const out: Record<Highlight['color'], number> = { amber: 0, green: 0, rust: 0, info: 0 };
    if (!hydrated) return out;
    for (const h of highlights) out[h.color]++;
    return out;
  }, [hydrated, highlights]);

  const filtered = useMemo(() => {
    if (!hydrated) return [];
    const q = query.trim().toLowerCase();
    let list = highlights.slice();
    if (colorFilter !== 'all') list = list.filter((h) => h.color === colorFilter);
    if (conceptFilter !== 'all') list = list.filter((h) => h.concept_slug === conceptFilter);
    if (q) {
      list = list.filter(
        (h) =>
          h.selected_text.toLowerCase().includes(q) ||
          (getConcept(h.concept_slug)?.title ?? h.concept_slug)
            .toLowerCase()
            .includes(q)
      );
    }
    list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return list;
  }, [hydrated, highlights, colorFilter, conceptFilter, query]);

  const confirmRemove = () => {
    if (!confirmingId) return;
    removeHighlight(confirmingId);
    setConfirmingId(null);
  };

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
        <span className="text-text-secondary">Highlights</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Highlights
        </h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Passages you marked while reading. Filter by color or concept, remove the ones you no longer need.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Color filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={colorFilter === 'all'} onClick={() => setColorFilter('all')}>
            <span className="text-text-muted">All</span>
            <span className="tnum text-text-faint">
              {hydrated ? highlights.length : '—'}
            </span>
          </FilterChip>
          {(Object.keys(HIGHLIGHT_COLOR) as Highlight['color'][]).map((c) => {
            const meta = HIGHLIGHT_COLOR[c];
            return (
              <FilterChip
                key={c}
                active={colorFilter === c}
                onClick={() => setColorFilter(colorFilter === c ? 'all' : c)}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
                <span>{meta.label}</span>
                <span className="tnum text-text-faint">
                  {hydrated ? colorCounts[c] : '—'}
                </span>
              </FilterChip>
            );
          })}
        </div>

        {/* Concept filter + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:max-w-xs sm:flex-1">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search highlighted text…"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              aria-label="Search highlights"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="rounded p-0.5 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {conceptOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-text-muted" />
              <select
                value={conceptFilter}
                onChange={(e) => setConceptFilter(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                aria-label="Filter by concept"
              >
                <option value="all">All concepts</option>
                {conceptOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Highlights list */}
      {!hydrated ? (
        <HighlightsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            query || colorFilter !== 'all' || conceptFilter !== 'all'
              ? 'No highlights match your filters.'
              : 'No highlights yet.'
          }
          description={
            query || colorFilter !== 'all' || conceptFilter !== 'all'
              ? 'Adjust your filters or clear the search.'
              : 'Select text in a concept to highlight.'
          }
          icon={<Highlighter className="h-5 w-5" />}
          action={
            !query && colorFilter === 'all' && conceptFilter === 'all' ? (
              <Link
                href="/concepts"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                Browse concepts <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] text-text-muted">
            <span>
              {filtered.length} highlight{filtered.length === 1 ? '' : 's'}
            </span>
            {(colorFilter !== 'all' || conceptFilter !== 'all' || query) && (
              <button
                onClick={() => {
                  setColorFilter('all');
                  setConceptFilter('all');
                  setQuery('');
                }}
                className="hover:text-accent"
              >
                Clear filters
              </button>
            )}
          </div>
          {filtered.map((h) => (
            <HighlightRow
              key={h.id}
              highlight={h}
              confirming={confirmingId === h.id}
              onStartConfirm={() => setConfirmingId(h.id)}
              onCancelConfirm={() => setConfirmingId(null)}
              onConfirmRemove={confirmRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Filter chip ──────────────────────────────────────────────── */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-surface text-text-secondary hover:bg-surface-subtle'
      )}
    >
      {children}
    </button>
  );
}

/* ── Highlight row ────────────────────────────────────────────── */
function HighlightRow({
  highlight: h,
  confirming,
  onStartConfirm,
  onCancelConfirm,
  onConfirmRemove,
}: {
  highlight: Highlight;
  confirming: boolean;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirmRemove: () => void;
}) {
  const concept = getConcept(h.concept_slug);
  const conceptTitle = concept?.title ?? h.concept_slug;
  const meta = HIGHLIGHT_COLOR[h.color];

  return (
    <Surface
      variant="solid"
      className={cn('group p-0', confirming && 'border-danger')}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            'mt-1.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-border',
            meta.dot
          )}
          aria-label={`color: ${meta.label}`}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/concepts/${h.concept_slug}?focus=${encodeURIComponent(h.selected_text)}${h.block_id ? `#${h.block_id}` : ''}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted hover:text-accent hover:underline"
          >
            {conceptTitle}
            <span className="inline-flex items-center gap-0.5 normal-case tracking-normal text-text-faint">
              <Hash className="h-3 w-3" />
              {h.block_id}
            </span>
          </Link>
          <blockquote
            className="mt-1.5 border-l-2 pl-3 text-sm leading-relaxed text-text-primary"
            style={{ borderColor: colorHex(h.color) }}
          >
            {h.selected_text}
          </blockquote>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                meta.bg,
                meta.text
              )}
            >
              {meta.label}
            </span>
            <span>·</span>
            <span>{timeAgo(h.created_at)}</span>
            <Link
              href={`/concepts/${h.concept_slug}?focus=${encodeURIComponent(h.selected_text)}${h.block_id ? `#${h.block_id}` : ''}`}
              className="ml-auto inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
            >
              Open source <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="shrink-0">
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onConfirmRemove}
                className="rounded-md bg-danger p-1.5 text-text-inverse hover:bg-danger/90"
                aria-label="Confirm delete"
                title="Confirm delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onCancelConfirm}
                className="rounded-md p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                aria-label="Cancel delete"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onStartConfirm}
              className="rounded-md p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100 focus:opacity-100"
              aria-label="Remove highlight"
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Surface>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────── */
function HighlightsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Surface key={i} variant="solid" className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-surface-inset" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-inset" />
          </div>
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-inset" />
          <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-surface-inset" />
        </Surface>
      ))}
    </div>
  );
}

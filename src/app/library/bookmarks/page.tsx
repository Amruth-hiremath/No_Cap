'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark as BookmarkIcon,
  Search,
  Trash2,
  ExternalLink,
  X,
  ArrowLeft,
  Hash,
} from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { getConcept } from '@/lib/content';
import type { Bookmark } from '@/lib/types';

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

export default function BookmarksPage() {
  const hydrated = useHydrated();
  const bookmarks = useStore((s) => s.bookmarks);
  const removeBookmark = useStore((s) => s.removeBookmark);

  const [query, setQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!hydrated) return [];
    const q = query.trim().toLowerCase();
    let list = bookmarks.slice();
    if (q) {
      list = list.filter((b) => {
        const concept = getConcept(b.concept_slug);
        const conceptTitle = (concept?.title ?? b.concept_slug).toLowerCase();
        return (
          b.label.toLowerCase().includes(q) ||
          conceptTitle.includes(q) ||
          b.concept_slug.toLowerCase().includes(q)
        );
      });
    }
    list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return list;
  }, [hydrated, bookmarks, query]);

  const confirmRemove = () => {
    if (!confirmingId) return;
    removeBookmark(confirmingId);
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
        <span className="text-text-secondary">Bookmarks</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Bookmarks
        </h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Concepts (and specific blocks) you saved to revisit. Jump back in, or remove the ones you no longer need.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:max-w-md">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by label or concept…"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          aria-label="Search bookmarks"
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

      {/* List */}
      {!hydrated ? (
        <BookmarksSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No bookmarks match your search.' : 'No bookmarks yet.'}
          description={
            query
              ? 'Try a different search term.'
              : 'Bookmark a concept from its page (or press B while reading) to save it here.'
          }
          icon={<BookmarkIcon className="h-5 w-5" />}
          action={
            !query ? (
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
          <div className="px-1 text-[11px] text-text-muted">
            {filtered.length} bookmark{filtered.length === 1 ? '' : 's'}
          </div>
          {filtered.map((b) => (
            <BookmarkRow
              key={b.id}
              bookmark={b}
              confirming={confirmingId === b.id}
              onStartConfirm={() => setConfirmingId(b.id)}
              onCancelConfirm={() => setConfirmingId(null)}
              onConfirmRemove={confirmRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bookmark row ─────────────────────────────────────────────── */
function BookmarkRow({
  bookmark: b,
  confirming,
  onStartConfirm,
  onCancelConfirm,
  onConfirmRemove,
}: {
  bookmark: Bookmark;
  confirming: boolean;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirmRemove: () => void;
}) {
  const concept = getConcept(b.concept_slug);
  const conceptTitle = concept?.title ?? b.concept_slug;
  const href = `/concepts/${b.concept_slug}${b.block_id ? `#${b.block_id}` : ''}`;

  return (
    <Surface variant="solid" className={confirming ? 'border-danger' : ''}>
      <div className="group flex items-start gap-3 p-4">
        <BookmarkIcon className="mt-0.5 h-4 w-4 shrink-0 fill-info text-info" />
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="text-sm font-semibold text-text-primary hover:text-accent hover:underline"
          >
            {b.label}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
            <Link
              href={href}
              className="inline-flex items-center gap-1 hover:text-accent hover:underline"
            >
              {conceptTitle}
              {b.block_id && (
                <span className="inline-flex items-center gap-0.5 text-text-faint">
                  <Hash className="h-3 w-3" />
                  {b.block_id}
                </span>
              )}
            </Link>
            <span>·</span>
            <span>{timeAgo(b.created_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={href}
            className="rounded-md p-1.5 text-text-muted transition-opacity hover:bg-surface-subtle hover:text-accent"
            aria-label="Open concept"
            title="Open"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {confirming ? (
            <>
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
            </>
          ) : (
            <button
              onClick={onStartConfirm}
              className="rounded-md p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100 focus:opacity-100"
              aria-label="Remove bookmark"
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
function BookmarksSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Surface key={i} variant="solid" className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-surface-inset" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-inset" />
          </div>
          <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-surface-inset" />
        </Surface>
      ))}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  StickyNote,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  Check,
  ArrowLeft,
  ArrowUpDown,
  Hash,
} from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { getConcept } from '@/lib/content';
import { cn } from '@/lib/utils';
import type { Note } from '@/lib/types';

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

type SortMode = 'recent' | 'concept';

export default function NotesPage() {
  const hydrated = useHydrated();
  const notes = useStore((s) => s.notes);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!hydrated) return [];
    const q = query.trim().toLowerCase();
    let list = notes.slice();
    if (q) {
      list = list.filter((n) => {
        const concept = getConcept(n.concept_slug);
        const conceptTitle = (concept?.title ?? n.concept_slug).toLowerCase();
        return (
          conceptTitle.includes(q) ||
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q)
        );
      });
    }
    if (sort === 'recent') {
      list.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } else {
      list.sort((a, b) => {
        const ca = getConcept(a.concept_slug)?.title ?? a.concept_slug;
        const cb = getConcept(b.concept_slug)?.title ?? b.concept_slug;
        return ca.localeCompare(cb);
      });
    }
    return list;
  }, [hydrated, notes, query, sort]);

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
    setDeletingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateNote(editingId, editTitle.trim() || 'Untitled note', editBody);
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteNote(deletingId);
    setDeletingId(null);
    if (editingId === deletingId) cancelEdit();
  };

  const isEditing = (id: string) => editingId === id;
  const isDeleting = (id: string) => deletingId === id;

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
        <span className="text-text-secondary">Notes</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Notes</h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Your takeaways, attached to specific concepts and blocks. Edit inline, delete with a click, jump back to the source.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:max-w-xs sm:flex-1">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by concept, title, or body…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            aria-label="Search notes"
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

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <SortButton
              active={sort === 'recent'}
              onClick={() => setSort('recent')}
            >
              Recent
            </SortButton>
            <SortButton
              active={sort === 'concept'}
              onClick={() => setSort('concept')}
            >
              By concept
            </SortButton>
          </div>
        </div>
      </div>

      {/* Notes list */}
      {!hydrated ? (
        <NotesSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? `No notes match “${query}”` : 'No notes yet.'}
          description={
            query
              ? 'Try a different search term.'
              : 'Select text in a concept to add notes.'
          }
          icon={<StickyNote className="h-5 w-5" />}
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
          <div className="flex items-center justify-between px-1 text-[11px] text-text-muted">
            <span>
              {filtered.length} note{filtered.length === 1 ? '' : 's'}
            </span>
            <span className="hidden sm:inline">
              Click a note to expand · Edit or delete inline
            </span>
          </div>
          {filtered.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              editing={isEditing(note.id)}
              editTitle={editTitle}
              editBody={editBody}
              onEditTitle={setEditTitle}
              onEditBody={setEditBody}
              onStartEdit={() => startEdit(note)}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              deleting={isDeleting(note.id)}
              onStartDelete={() => setDeletingId(note.id)}
              onCancelDelete={() => setDeletingId(null)}
              onConfirmDelete={confirmDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sort button ───────────────────────────────────────────────── */
function SortButton({
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
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-text-muted hover:text-text-primary'
      )}
    >
      {children}
    </button>
  );
}

/* ── Note row ──────────────────────────────────────────────────── */
function NoteRow({
  note,
  editing,
  editTitle,
  editBody,
  onEditTitle,
  onEditBody,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  deleting,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  note: Note;
  editing: boolean;
  editTitle: string;
  editBody: string;
  onEditTitle: (v: string) => void;
  onEditBody: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  deleting: boolean;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const concept = getConcept(note.concept_slug);
  const conceptTitle = concept?.title ?? note.concept_slug;
  const focusParams = note.selected_text ? `?focus=${encodeURIComponent(note.selected_text)}${typeof note.anchor_start === 'number' ? `&start=${note.anchor_start}` : ''}${typeof note.anchor_end === 'number' ? `&end=${note.anchor_end}` : ''}` : '';
  const conceptHref = `/concepts/${note.concept_slug}${focusParams}${note.block_id ? `#${note.block_id}` : ''}`;
  const wasEdited =
    new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() >
    5_000;

  return (
    <Surface variant="solid" className="overflow-hidden p-0">
      {editing ? (
        /* Inline editor */
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <Link
              href={conceptHref}
              className="inline-flex items-center gap-1 hover:text-accent hover:underline"
            >
              {conceptTitle}
              {note.block_id && (
                <span className="inline-flex items-center gap-0.5 text-text-faint">
                  <Hash className="h-3 w-3" />
                  {note.block_id}
                </span>
              )}
            </Link>
            <span>Editing</span>
          </div>
          <input
            value={editTitle}
            onChange={(e) => onEditTitle(e.target.value)}
            placeholder="Note title"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            aria-label="Note title"
          />
          <textarea
            value={editBody}
            onChange={(e) => onEditBody(e.target.value)}
            placeholder="Write your note…"
            rows={5}
            className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
            aria-label="Note body"
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onSaveEdit}>
              <Check className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      ) : deleting ? (
        /* Delete confirmation */
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div className="text-sm">
              <div className="font-medium text-text-primary">Delete this note?</div>
              <div className="text-text-muted">
                “{note.title || 'Untitled note'}” — this can’t be undone.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelDelete}>
              Keep
            </Button>
            <Button variant="danger" size="sm" onClick={onConfirmDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        /* Default view */
        <div className="group p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={conceptHref}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted hover:text-accent hover:underline"
              >
                {conceptTitle}
                {note.block_id && (
                  <span className="inline-flex items-center gap-0.5 normal-case tracking-normal text-text-faint">
                    <Hash className="h-3 w-3" />
                    {note.block_id}
                  </span>
                )}
              </Link>
              <h3 className="mt-1 text-sm font-semibold text-text-primary">
                {note.title || 'Untitled note'}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                onClick={onStartEdit}
                className="rounded-md p-1.5 text-text-muted hover:bg-surface-subtle hover:text-accent"
                aria-label="Edit note"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onStartDelete}
                className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger"
                aria-label="Delete note"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {note.body && (
            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {note.body}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
            <span>Created {timeAgo(note.created_at)}</span>
            {wasEdited && <span>· Updated {timeAgo(note.updated_at)}</span>}
            <Link
              href={conceptHref}
              className="ml-auto inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
            >
              Open source <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </Surface>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────── */
function NotesSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
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

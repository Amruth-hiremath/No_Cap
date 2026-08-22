 'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { findBlockIdFromSelection, getSelectionContext, type ReadingActionEventDetail } from '@/lib/useKeyboardShortcuts';
import { Highlighter, StickyNote, Bookmark as BookmarkIcon, Copy, X, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadingToolsProps { conceptSlug: string; }
type HighlightColor = 'amber' | 'green' | 'rust' | 'info';

export function ReadingTools({ conceptSlug }: ReadingToolsProps) {
  const hydrated = useHydrated();
  const [selection, setSelection] = useState('');
  const [blockId, setBlockId] = useState('unknown');
  const [anchorStart, setAnchorStart] = useState<number | undefined>(undefined);
  const [anchorEnd, setAnchorEnd] = useState<number | undefined>(undefined);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('amber');
  const [undoHighlightId, setUndoHighlightId] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addHighlight = useStore((s) => s.addHighlight);
  const removeHighlight = useStore((s) => s.removeHighlight);
  const addNote = useStore((s) => s.addNote);
  const addBookmark = useStore((s) => s.addBookmark);

  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPosition(null); setSelection(''); setBlockId('unknown'); setAnchorStart(undefined); setAnchorEnd(undefined); return;
    }
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 2) { setPosition(null); setSelection(''); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    let node: Node | null = range.startContainer;
    let id = 'unknown';
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && node.dataset.blockId) { id = node.dataset.blockId; break; }
      node = node.parentNode;
    }
    const blockEl = node instanceof HTMLElement ? node : null;
    let nextStart: number | undefined;
    let nextEnd: number | undefined;
    if (blockEl?.dataset.blockId) {
      const anchor = document.createRange();
      anchor.selectNodeContents(blockEl);
      anchor.setEnd(range.startContainer, range.startOffset);
      nextStart = anchor.toString().length;
      nextEnd = nextStart + text.length;
    }
    setSelection(text);
    setBlockId(id);
    setAnchorStart(nextStart);
    setAnchorEnd(nextEnd);
    setPosition({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.addEventListener('selectionchange', captureSelection);
    return () => document.removeEventListener('selectionchange', captureSelection);
  }, [hydrated, captureSelection]);

  const dismiss = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(''); setPosition(null); setBlockId('unknown'); setAnchorStart(undefined); setAnchorEnd(undefined);
  }, []);

  const handleHighlight = useCallback(() => {
    if (!selection) return;
    const id = addHighlight(conceptSlug, blockId, selection, highlightColor);
    setUndoHighlightId(id); setUndoVisible(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoVisible(false), 5000);
    dismiss();
  }, [selection, conceptSlug, blockId, highlightColor, addHighlight, dismiss]);

  const handleUndo = useCallback(() => {
    if (!undoHighlightId) return;
    removeHighlight(undoHighlightId);
    setUndoVisible(false); setUndoHighlightId(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, [undoHighlightId, removeHighlight]);

  const handleAddNote = useCallback(() => {
    if (!selection) return;
    setNoteTitle(selection.slice(0, 60) + (selection.length > 60 ? '…' : ''));
    setShowNoteEditor(true);
  }, [selection]);

  const handleSaveNote = useCallback(() => {
    if (!noteTitle.trim() && !noteBody.trim()) { setShowNoteEditor(false); return; }
    addNote(conceptSlug, noteTitle.trim() || 'Untitled note', noteBody, blockId, selection, anchorStart, anchorEnd);
    setShowNoteEditor(false); setNoteTitle(''); setNoteBody(''); dismiss();
  }, [noteTitle, noteBody, conceptSlug, blockId, selection, addNote, dismiss]);

  const handleCopy = useCallback(() => {
    if (!selection) return;
    void navigator.clipboard?.writeText(selection);
    dismiss();
  }, [selection, dismiss]);

  const handleBookmark = useCallback(() => {
    if (!selection) return;
    addBookmark(conceptSlug, selection.slice(0, 100), blockId);
    dismiss();
  }, [selection, conceptSlug, blockId, addBookmark, dismiss]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ReadingActionEventDetail>).detail;
      if (!detail?.selection || detail.selection.length < 2) return;
      const ctx = getSelectionContext();
      const id = detail.blockId || ctx.blockId || findBlockIdFromSelection();
      setSelection(detail.selection);
      setBlockId(id);
      setAnchorStart(detail.anchorStart ?? ctx.anchorStart);
      setAnchorEnd(detail.anchorEnd ?? ctx.anchorEnd);
      if (detail.action === 'highlight') {
        const highlightId = addHighlight(conceptSlug, id, detail.selection, highlightColor);
        setUndoHighlightId(highlightId);
        setUndoVisible(true);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndoVisible(false), 5000);
        dismiss();
      } else if (detail.action === 'note') {
        setNoteTitle(detail.selection.slice(0, 60) + (detail.selection.length > 60 ? '…' : ''));
        setShowNoteEditor(true);
      }
    };
    window.addEventListener('nocap:reading-action', handler as EventListener);
    return () => window.removeEventListener('nocap:reading-action', handler as EventListener);
  }, [conceptSlug, highlightColor, addHighlight, dismiss]);

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  if (!hydrated) return null;
  return (
    <>
      {undoVisible && (
        <div className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-border-strong bg-text-primary px-3 py-2.5 text-xs font-semibold text-text-inverse shadow-2xl animate-scale-in">
          <span className="inline-flex items-center gap-1.5"><Highlighter className="h-3.5 w-3.5 text-accent"/> Highlight added</span>
          <button onClick={handleUndo} className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/20 px-2.5 text-text-inverse transition-colors hover:bg-white/10" title="Undo highlight">
            <Undo2 className="h-3 w-3" /> Undo
          </button>
      </div>
      )}

      {position && !showNoteEditor && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-2xl border border-border-strong bg-surface-elevated p-1.5 shadow-2xl animate-slide-down"
          style={{ left: `${Math.max(8, Math.min(position.x - 150, window.innerWidth - 308))}px`, top: `${Math.max(8, position.y - 54)}px` }}
        >
          <button onClick={handleHighlight} className="reading-action-btn reading-action-btn--primary"><Highlighter className="mr-1 inline h-3.5 w-3.5"/>Highlight</button>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-subtle px-1.5 py-1">
            {(['amber','green','rust','info'] as HighlightColor[]).map((c) => (
              <button key={c} onClick={() => setHighlightColor(c)} aria-label={`Highlight ${c}`} aria-pressed={highlightColor === c} className={cn('h-4 w-4 shrink-0 rounded-full border-2 transition-transform', c==='amber'?'bg-[#f7d77a]':c==='green'?'bg-[#9cc8a7]':c==='rust'?'bg-[#e6a48e]':'bg-[#8fc8c4]', highlightColor===c?'scale-110 border-text-primary ring-2 ring-border-strong ring-offset-1':'border-white/70')} title={`Highlight ${c}`}/>
            ))}
          </div>
          <button onClick={handleAddNote} aria-label="Add note" className="reading-action-btn"><StickyNote className="mr-1 inline h-3.5 w-3.5"/>Note</button>
          <button onClick={handleCopy} aria-label="Copy selection" className="reading-action-btn" title="Copy"><Copy className="h-3.5 w-3.5"/></button>
          <button onClick={handleBookmark} aria-label="Bookmark selection" className="reading-action-btn" title="Bookmark"><BookmarkIcon className="h-3.5 w-3.5"/></button>
        </div>
      )}

      {showNoteEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-text-primary/30 p-4 backdrop-blur-[2px]" onClick={() => setShowNoteEditor(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-editor-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-surface-elevated p-5 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Reading note</p><h3 id="note-editor-title" className="mt-1 text-base font-semibold text-text-primary">Capture the idea</h3></div><button onClick={() => setShowNoteEditor(false)} aria-label="Close note editor" className="reading-icon-btn"><X className="h-4 w-4"/></button></div>
            <div className="mb-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-3 text-xs leading-relaxed text-text-secondary">“{selection.length > 180 ? selection.slice(0,180) + '…' : selection}”</div>
            <input autoFocus value={noteTitle} onChange={(e)=>setNoteTitle(e.target.value)} placeholder="Give this note a useful title" aria-label="Note title" className="mb-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent"/>
            <textarea value={noteBody} onChange={(e)=>setNoteBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setShowNoteEditor(false); }} placeholder="Your interpretation, question, analogy, or interview tip…" rows={6} aria-label="Note body" className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm leading-relaxed text-text-primary outline-none focus:border-accent"/>
            <div className="mt-3 flex justify-end gap-2"><button onClick={()=>setShowNoteEditor(false)} className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-surface-subtle">Cancel</button><button onClick={handleSaveNote} className="rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-text-inverse hover:bg-accent-hover">Save note</button></div>
          </div>
        </div>
      )}
    </>
  );
}

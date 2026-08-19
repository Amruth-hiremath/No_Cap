'use client';

/* ═══════════════════════════════════════════════════════════════════
   useKeyboardShortcuts — global reading shortcuts.
   ═══════════════════════════════════════════════════════════════════

   Mounted once at the AppShell root. All shortcuts are no-ops when the
   user is typing into an input, textarea, select, or contenteditable
   element so we don't steal their keystrokes.

   Shortcuts:
     /        focus search (open command palette)
     f        toggle focus mode
     b        bookmark the current concept
     h        highlight the currently selected text
     n        open the note editor on the currently selected text

   Escape is already handled by AppShell (close palette / exit focus).

   For `h` and `n`, we dispatch a `nocap:reading-action` CustomEvent on
   `window`. ReadingTools listens for it and reuses its existing handlers
   so the keyboard path and the click path share the same logic.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getConcept } from '@/lib/content';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when the user is currently focused on a text-input surface. */
function isUserTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return TYPING_TAGS.has(el.tagName);
}

export interface SelectionContext {
  text: string;
  blockId: string;
  anchorStart?: number;
  anchorEnd?: number;
}

export function getSelectionContext(): SelectionContext {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return { text: '', blockId: 'unknown' };
  const range = sel.getRangeAt(0);
  const text = sel.toString().replace(/\s+/g, ' ').trim();
  let node: Node | null = range.startContainer;
  let block: HTMLElement | null = null;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement && node.dataset.blockId) { block = node; break; }
    node = node.parentNode;
  }
  if (!block) return { text, blockId: 'unknown' };
  const pre = document.createRange();
  pre.selectNodeContents(block);
  pre.setEnd(range.startContainer, range.startOffset);
  const anchorStart = pre.toString().length;
  return { text, blockId: block.dataset.blockId || 'unknown', anchorStart, anchorEnd: anchorStart + text.length };
}

/** Walk up from the selection anchor to find the closest `[data-block-id]`. */
function findBlockIdFromSelection(): string {
  return getSelectionContext().blockId;
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Let browser / OS shortcuts through.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't fire while the user is typing in a field.
      if (isUserTyping()) return;

      const key = e.key;

      // `/` — open command palette (search).
      if (key === '/') {
        e.preventDefault();
        useStore.getState().setCommandPaletteOpen(true);
        return;
      }

      // `f` — toggle focus mode.
      if (key === 'f' || key === 'F') {
        e.preventDefault();
        const s = useStore.getState();
        s.setFocusMode(!s.focus_mode);
        return;
      }

      // `b` — bookmark the current concept (uses last visited slug).
      if (key === 'b' || key === 'B') {
        const s = useStore.getState();
        const slug = s.last_visited_concept;
        if (!slug) return;
        const concept = getConcept(slug);
        e.preventDefault();
        s.addBookmark(slug, concept?.title ?? slug);
        return;
      }

      // `h` — highlight the currently selected text.
      // `n` — open the note editor on the currently selected text.
      if (key === 'h' || key === 'H' || key === 'n' || key === 'N') {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? '';
        if (text.length < 2) return;
        e.preventDefault();
        const action = key.toLowerCase() === 'h' ? 'highlight' : 'note';
        window.dispatchEvent(
          new CustomEvent('nocap:reading-action', {
            detail: { action, ...getSelectionContext() },
          })
        );
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

export type ReadingAction = 'highlight' | 'note';
export interface ReadingActionEventDetail {
  action: ReadingAction;
  selection: string;
  blockId?: string;
  anchorStart?: number;
  anchorEnd?: number;
}

/** Re-exported so ReadingTools can grab the block-id helper without duplicating. */
export { findBlockIdFromSelection };

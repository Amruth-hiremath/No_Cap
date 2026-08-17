'use client';

import { Search, Flame, Focus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function TopBar() {
  const streak = useStore((s) => s.streak.current);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);

  return (
    <header className="glass-smoke sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border px-4 md:px-8">
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="group flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary md:max-w-sm"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="flex-1 text-left">Search concepts, glossary...</span>
        <kbd className="hidden rounded border border-border bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-text-muted md:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFocusMode(!focusMode)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors border',
            focusMode
              ? 'bg-accent text-text-inverse border-accent'
              : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary border-border'
          )}
          title="Toggle focus mode (Esc to exit)"
          aria-pressed={focusMode}
        >
          <Focus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Focus</span>
        </button>

        <div
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5"
          title="Daily streak"
        >
          <Flame className="h-4 w-4 text-accent" aria-hidden />
          <span className="tnum text-sm font-semibold text-text-primary">{streak}</span>
          <span className="text-[11px] text-text-muted">day</span>
        </div>
      </div>
    </header>
  );
}

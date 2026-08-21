'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  ArrowRight,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Zap,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { universalSearchLite, getAllConceptSummaries, getGlossaryLite } from '@/lib/content-lite';
import { cn } from '@/lib/utils';

interface ResultRow {
  type: 'concept' | 'glossary' | 'action';
  title: string;
  subtitle?: string;
  href?: string;
  group: string;
  meta?: string;
}

const ACTIONS: ResultRow[] = [
  {
    type: 'action',
    title: 'Start today\'s Daily Dose',
    subtitle: 'Guided 12-minute session',
    href: '/daily',
    group: 'Actions',
    meta: 'G',
  },
  {
    type: 'action',
    title: 'Go to Review queue',
    subtitle: 'Spaced repetition',
    href: '/review',
    group: 'Actions',
    meta: 'R',
  },
  {
    type: 'action',
    title: 'Open Labs',
    subtitle: 'Interactive system-design simulations',
    href: '/labs',
    group: 'Actions',
    meta: 'L',
  },
  {
    type: 'action',
    title: 'Open Roadmap',
    subtitle: 'See the dependency graph',
    href: '/roadmap',
    group: 'Actions',
    meta: 'M',
  },
  {
    type: 'action',
    title: 'Open Notes',
    subtitle: 'Block editor + infinite canvas',
    href: '/notes',
    group: 'Actions',
    meta: 'N',
  },
  {
    type: 'action',
    title: 'Toggle focus mode',
    subtitle: 'Distraction-free surface',
    href: '__focus__',
    group: 'Actions',
    meta: 'F',
  },
  {
    type: 'action',
    title: 'Toggle theme',
    subtitle: 'Light Green / Dark',
    href: '__theme__',
    group: 'Actions',
    meta: 'T',
  },
];

export function CommandPalette() {
  const open = useStore((s) => s.command_palette_open);
  const setOpen = useStore((s) => s.setCommandPaletteOpen);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const focusMode = useStore((s) => s.focus_mode);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, 100));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const rows = currentResults[activeIdx];
        if (rows) go(rows);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const go = (row: ResultRow) => {
    if (!row.href) return;
    if (row.href === '__focus__') {
      setFocusMode(!focusMode);
      setOpen(false);
      return;
    }
    if (row.href === '__theme__') {
      const next = theme === 'sage' ? 'dark' : 'sage';
      setTheme(next);
      setOpen(false);
      return;
    }
    router.push(row.href);
    setOpen(false);
  };

  const results = useMemo<ResultRow[]>(() => {
    if (!query.trim()) {
      // Default: show recent concept + actions
      return [
        ...ACTIONS,
        ...getAllConceptSummaries().slice(0, 3).map((c) => ({
          type: 'concept' as const,
          title: c.title,
          subtitle: c.summary,
          href: `/concepts/${c.slug}`,
          group: 'Concepts',
          meta: `${c.estimated_minutes}m`,
        })),
      ];
    }
    const searchResults = universalSearchLite(query).map((r) => ({
      type: r.type,
      title: r.title,
      subtitle: r.subtitle,
      href: r.href,
      group: r.group,
    }));
    // Always include actions
    const q = query.toLowerCase();
    const matchingActions = ACTIONS.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)
    );
    return [...matchingActions, ...searchResults];
  }, [query]);

  // Group results
  const grouped = useMemo(() => {
    const groups: Record<string, ResultRow[]> = {};
    for (const r of results) {
      if (!groups[r.group]) groups[r.group] = [];
      groups[r.group].push(r);
    }
    return groups;
  }, [results]);

  // Flatten for index tracking
  const currentResults = useMemo(() => {
    return Object.values(grouped).flat();
  }, [grouped]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-text-primary/30 pt-[10vh] backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="glass-dark w-full max-w-xl overflow-hidden rounded-xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Search concepts, glossary, or jump to..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            aria-label="Search query"
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-text-muted hover:bg-surface-subtle"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {currentResults.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {Object.entries(grouped).map(([group, rows]) => (
            <div key={group} className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
                {group}
              </div>
              {rows.map((row) => {
                const flatIdx = currentResults.indexOf(row);
                const isActive = flatIdx === activeIdx;
                return (
                  <button
                    key={`${group}-${row.title}`}
                    onMouseEnter={() => setActiveIdx(flatIdx)}
                    onClick={() => go(row)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-text-inverse'
                        : 'text-text-primary hover:bg-surface-subtle'
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{row.title}</div>
                      {row.subtitle && (
                        <div
                          className={cn(
                            'text-xs line-clamp-1',
                            isActive ? 'text-text-inverse/70' : 'text-text-muted'
                          )}
                        >
                          {row.subtitle}
                        </div>
                      )}
                    </div>
                    {row.meta && (
                      <kbd
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                          isActive
                            ? 'border-text-inverse/30 text-text-inverse'
                            : 'border-border bg-surface text-text-muted'
                        )}
                      >
                        {row.meta}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              open
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              actions
            </span>
          </div>
          <span className="hidden sm:inline">{getGlossaryLite().length} glossary · {getAllConceptSummaries().length} concepts</span>
        </div>
      </div>
    </div>
  );
}

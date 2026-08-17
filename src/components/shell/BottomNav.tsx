'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, BookOpen, RotateCcw, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useState } from 'react';
import { X, TrendingUp, BookText, Dumbbell, Settings } from 'lucide-react';

const primary = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/roadmap', label: 'Map', icon: Map },
  { href: '/concepts', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: Dumbbell },
  { href: '/review', label: 'Review', icon: RotateCcw, badge: true },
];

const secondary = [
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/glossary', label: 'Glossary', icon: BookText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const dueCount = useStore((s) => {
    const now = new Date();
    return Object.values(s.review_items).filter((r) => new Date(r.due_at) <= now).length;
  });

  return (
    <nav
      className="glass-smoke fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border pb-safe md:hidden"
      aria-label="Mobile navigation"
    >
      {primary.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-accent' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden />
              {item.badge && dueCount > 0 && (
                <span className="tnum absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-semibold text-text-inverse">
                  {dueCount}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={() => setMoreOpen(true)}
        className={cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
          'text-text-muted hover:text-text-primary'
        )}
        aria-label="More navigation"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
        More
      </button>

      {moreOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-text-primary/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="glass-smoke w-full rounded-t-2xl border-t border-border p-4 pb-safe animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded p-1 text-text-muted hover:bg-surface-subtle"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border bg-surface text-text-secondary'
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

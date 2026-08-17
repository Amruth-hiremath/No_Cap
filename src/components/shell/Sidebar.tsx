'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Map,
  BookOpen,
  Dumbbell,
  RotateCcw,
  TrendingUp,
  BookText,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/Badge';

const navItems = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/concepts', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: Dumbbell },
  { href: '/review', label: 'Review', icon: RotateCcw, badge: true },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/glossary', label: 'Glossary', icon: BookText },
];

export function Sidebar() {
  const pathname = usePathname();
  const dueCount = useStore((s) => {
    const now = new Date();
    return Object.values(s.review_items).filter((r) => new Date(r.due_at) <= now).length;
  });

  return (
    <aside className="glass-smoke fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border md:flex">
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="NO CAP home">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-text-inverse">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-bold tracking-tight text-text-primary">NO CAP</span>
          <span className="rounded bg-surface-subtle px-1 py-0.5 text-[10px] font-medium text-text-muted">
            v0.1
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-2.5 py-2" aria-label="Primary">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'bg-accent-soft text-accent font-medium'
                      : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && dueCount > 0 && (
                    <span className="tnum rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                      {dueCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-2.5">
        <Link
          href="/settings"
          aria-current={pathname === '/settings' ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
            pathname === '/settings'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
          )}
        >
          <Settings className="h-4 w-4" aria-hidden />
          <span>Settings</span>
        </Link>
        <div className="mt-2 px-2.5 py-1.5">
          <Badge variant="default">Local mode</Badge>
          <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
            State lives in this browser. No cloud sync in v0.1.
          </p>
        </div>
      </div>
    </aside>
  );
}

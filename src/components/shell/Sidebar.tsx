'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, BookOpen, Dumbbell, RotateCcw, TrendingUp, BookText, StickyNote, Settings, FlaskConical, Library, NotebookTabs, Sparkles, UserRound, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

const primary = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/concepts', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: Dumbbell },
  { href: '/labs', label: 'Labs', icon: FlaskConical },
  { href: '/review', label: 'Review', icon: RotateCcw, badge: true },
];
const study = [
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/library/notes', label: 'Notes', icon: NotebookTabs },
  { href: '/glossary', label: 'Glossary', icon: BookText },
  { href: '/resources', label: 'Resources', icon: ExternalLink },
];

function Brand() {
  return (
    <div className="nocap-brand">
      <div className="nocap-brand__mark" aria-hidden>
        <img src="/brand/no-cap-logo.png" alt="" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-text-primary">NO CAP</div>
        <div className="truncate text-[10px] font-medium text-text-muted">Design it. Break it. Scale it.</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const dueCount = useStore((s) => {
    const now = new Date();
    return Object.values(s.review_items).filter((r) => new Date(r.due_at) <= now).length;
  });
  const user = useStore((s) => s.user);

  const nav = (items: typeof primary) => items.map((item) => {
    const Icon = item.icon;
    const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <li key={item.href}>
        <Link href={item.href} className={cn('sidebar-link', active && 'sidebar-link--active')} aria-current={active ? 'page' : undefined}>
          <span className="sidebar-link__icon"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge && dueCount > 0 && <span className="sidebar-link__badge">{dueCount}</span>}
          {active && <ChevronRight className="h-3 w-3 text-accent opacity-70" />}
        </Link>
      </li>
    );
  });

  const accountActive = pathname === '/account' || pathname.startsWith('/account/');
  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/');

  return (
    <aside className="sidebar-shell sticky top-0 z-30 hidden h-screen w-[248px] shrink-0 md:flex">
      <div className="flex h-full w-full flex-col">
        <div className="sidebar-brandbar">
          <Link href="/" aria-label="NO CAP home"><Brand /></Link>
        </div>

        <div className="px-3 pt-3">
          <Link href="/" className="sidebar-workspace">
            <div className="workspace-dot"><Sparkles className="h-3.5 w-3.5" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-faint">Workspace</div>
              <div className="truncate text-xs font-semibold text-text-primary">System Design Gym</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
          <div className="sidebar-section-label">Learn</div>
          <ul className="space-y-1">{nav(primary)}</ul>
          <div className="sidebar-section-label mt-6">Library & tools</div>
          <ul className="space-y-1">{nav(study)}</ul>
          <div className="mt-2 space-y-1">
            <li>
              <Link href="/account" className={cn('sidebar-link', accountActive && 'sidebar-link--active')}>
                <span className="sidebar-link__icon"><UserRound className="h-4 w-4" /></span>
                <span className="flex-1">Account</span>
                {accountActive && <ChevronRight className="h-3 w-3 text-accent opacity-70" />}
              </Link>
            </li>
            <li>
              <Link href="/settings" className={cn('sidebar-link', settingsActive && 'sidebar-link--active')}>
                <span className="sidebar-link__icon"><Settings className="h-4 w-4" /></span>
                <span className="flex-1">Settings</span>
                {settingsActive && <ChevronRight className="h-3 w-3 text-accent opacity-70" />}
              </Link>
            </li>
          </div>
        </nav>

        <div className="sidebar-footer">
          <Link href="/library/notes/new" className="sidebar-quick">
            <StickyNote className="h-4 w-4" />
            <span className="flex-1">Quick note</span>
            <kbd>⌘N</kbd>
          </Link>
          <div className="sidebar-user-row">
            <Link href="/account" className="sidebar-user-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">
                {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-text-primary">{user?.name || 'Local learner'}</div>
                <div className="truncate text-[10px] text-text-muted">{user?.email || 'Not signed in'}</div>
              </div>
            </Link>
            <Link href="/settings" className={cn('sidebar-settings-button', settingsActive && 'is-active')} aria-label="Open settings">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

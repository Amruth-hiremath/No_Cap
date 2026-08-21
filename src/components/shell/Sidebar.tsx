'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Map, BookOpen, Dumbbell, RotateCcw, TrendingUp, BookText, StickyNote,
  Settings, FlaskConical, Library, Sparkles, UserRound, ChevronRight, ExternalLink,
  Pin, PinOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useEffect, useMemo, useState } from 'react';

const groups = [
  {
    label: 'Core',
    items: [
      { href: '/', label: 'Today', icon: Home },
      { href: '/roadmap', label: 'Roadmap', icon: Map },
      { href: '/concepts', label: 'Learn', icon: BookOpen },
      { href: '/practice', label: 'Practice', icon: Dumbbell },
      { href: '/review', label: 'Review', icon: RotateCcw, badge: true },
    ],
  },
  {
    label: 'Practice',
    items: [
      { href: '/labs', label: 'Labs', icon: FlaskConical },
      { href: '/progress', label: 'Progress', icon: TrendingUp },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/notes', label: 'Notes', icon: StickyNote },
      { href: '/library', label: 'Library', icon: Library },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/glossary', label: 'Glossary', icon: BookText },
      { href: '/resources', label: 'Resources', icon: ExternalLink },
    ],
  },
];

function Brand({ expanded }: { expanded: boolean }) {
  return (
    <div className={cn('nocap-brand', !expanded && 'justify-center')}>
      <div className="nocap-brand__mark" aria-hidden>
        <img src="/brand/no-cap-mark.png" alt="" />
      </div>
      {expanded && <div className="min-w-0 animate-brand-reveal">
        <div className="truncate text-[14px] font-extrabold tracking-[-0.03em] text-text-primary">NO CAP</div>
        <div className="truncate text-[9px] font-medium text-text-muted">Design it. Break it. Scale it.</div>
      </div>}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [autoPeek, setAutoPeek] = useState(true);
  const dueCount = useStore((s) => Object.values(s.review_items).filter((r) => new Date(r.due_at) <= new Date()).length);
  const user = useStore((s) => s.user);

  useEffect(() => {
    try {
      setAutoPeek(localStorage.getItem('nocap-sidebar-auto-peek') !== '0');
      setPinned(localStorage.getItem('nocap-sidebar-pinned') === '1');
    } catch {}
    const onMode = () => {
      try {
        setAutoPeek(localStorage.getItem('nocap-sidebar-auto-peek') !== '0');
        setPinned(localStorage.getItem('nocap-sidebar-pinned') === '1');
      } catch {}
    };
    window.addEventListener('nocap:sidebar-mode', onMode);
    return () => window.removeEventListener('nocap:sidebar-mode', onMode);
  }, []);

  const expanded = !autoPeek || hovered || pinned;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-current', expanded ? '250px' : '64px');
    return () => {
      document.documentElement.style.removeProperty('--sidebar-current');
    };
  }, [expanded]);

  const togglePinned = () => {
    setPinned((value) => {
      const next = !value;
      try { localStorage.setItem('nocap-sidebar-pinned', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        togglePinned();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const flatHrefs = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.href)), []);
  const matchedHref = flatHrefs
    .filter((href) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0] || '';

  return (
    <aside
      className={cn('sidebar-shell', expanded && 'sidebar-shell--expanded', !expanded && 'sidebar-shell--rail')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="NO CAP navigation"
    >
      <div className="sidebar-shell__inner">
        <div className="sidebar-brandbar">
          <Link href="/" aria-label="NO CAP home"><Brand expanded={expanded} /></Link>
          {expanded && <button onClick={togglePinned} className="sidebar-pin-btn" aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'} title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}>
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>}
        </div>

        {expanded && <div className="px-3 pt-3 animate-shell-reveal">
          <Link href="/" className="sidebar-workspace">
            <div className="workspace-dot"><Sparkles className="h-3.5 w-3.5" /></div>
            <div className="min-w-0 flex-1"><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-faint">Workspace</div><div className="truncate text-xs font-semibold text-text-primary">Design Workspace</div></div>
            <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
          </Link>
        </div>}

        <nav className={cn('flex-1 overflow-y-auto py-4', expanded ? 'px-2.5' : 'px-2')} aria-label="Primary">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              {expanded && <div className="sidebar-section-label">{group.label}</div>}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = matchedHref === item.href;
                  return <li key={item.href}>
                    <Link prefetch={false} href={item.href} title={!expanded ? item.label : undefined} aria-current={active ? 'page' : undefined} className={cn('sidebar-link', !expanded && 'sidebar-link--collapsed', active && 'sidebar-link--active')}>
                      <span className="sidebar-link__icon"><Icon className="h-4 w-4" /></span>
                      {expanded && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {expanded && item.badge && dueCount > 0 && <span className="sidebar-link__badge">{dueCount}</span>}
                      {expanded && active && <ChevronRight className="h-3 w-3 text-accent opacity-70" />}
                    </Link>
                  </li>;
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn('sidebar-footer', !expanded && 'sidebar-footer--rail')}>
          <Link prefetch={false} href="/notes?new=1" className={cn('sidebar-quick', !expanded && 'justify-center')} title={!expanded ? 'Quick note' : undefined}>
            <StickyNote className="h-4 w-4" />
            {expanded && <><span className="flex-1">Quick note</span><kbd>⌘N</kbd></>}
          </Link>
          <div className={cn('sidebar-user-row', !expanded && 'justify-center')}>
            <Link href="/account" className={cn('sidebar-user-card', !expanded && 'justify-center')} title={!expanded ? (user?.name || 'Account') : undefined}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">
                {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" />}
              </div>
              {expanded && <div className="min-w-0 flex-1 animate-shell-reveal"><div className="truncate text-xs font-semibold text-text-primary">{user?.name || 'Learner'}</div><div className="truncate text-[10px] text-text-muted">{user?.email || 'Not signed in'}</div></div>}
            </Link>
            {expanded && <Link href="/settings" className="sidebar-settings-button" aria-label="Open settings"><Settings className="h-4 w-4" /></Link>}
          </div>
        </div>
      </div>
      {!expanded && <div className="sidebar-hover-hint" aria-hidden><ChevronRight className="h-3 w-3" /></div>}
    </aside>
  );
}

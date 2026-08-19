'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Flame, Focus, StickyNote, Cloud, UserRound, ChevronDown, Settings, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useSync } from '@/lib/useSync';
import { useState, useEffect } from 'react';

export function TopBar() {
  const streak = useStore((s) => s.streak.current);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const user = useStore((s) => s.user);
  const pathname = usePathname();
  const { status } = useSync();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const titleMap: Record<string, string> = {
    '/': 'Today', '/roadmap': 'Roadmap', '/concepts': 'Learn', '/practice': 'Practice', '/labs': 'Labs',
    '/review': 'Review', '/progress': 'Progress', '/library': 'Library', '/library/notes': 'Notes',
    '/glossary': 'Glossary', '/resources': 'Resources', '/settings': 'Settings', '/account': 'Account',
  };
  const matched = Object.keys(titleMap).sort((a, b) => b.length - a.length).find((k) => pathname === k || pathname.startsWith(k + '/'));
  const title = matched ? titleMap[matched] : 'NO CAP';
  const synced = status === 'synced';
  const syncing = status === 'syncing';

  return (
    <header className={cn('topbar-shell sticky top-0 z-20 h-[68px] shrink-0 px-3 py-2.5 md:px-5', scrolled && 'topbar-shell--scrolled')}>
      <div className="topbar-inner">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="topbar-mobile-brand md:hidden" aria-label="NO CAP home">
            <span className="topbar-mobile-brand__mark"><img src="/brand/no-cap-logo.png" alt="" /></span>
            <Sparkles className="h-3 w-3 text-accent" />
          </Link>
          <div className="hidden min-w-[128px] sm:block">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-faint">NO CAP / Workspace</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-text-primary">{title}</div>
          </div>
          <button onClick={() => setCommandPaletteOpen(true)} className="topbar-search" aria-label="Open command palette">
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">Search concepts, glossary, notes…</span>
            <kbd>⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {user && (
            <div className={cn('sync-mini', synced && 'sync-mini--ok', syncing && 'sync-mini--busy')} title={synced ? 'Synced' : syncing ? 'Syncing' : status === 'offline' ? 'Offline' : 'Sync status'}>
              <span className="sync-mini__dot" />
              <span className="hidden lg:inline">{synced ? 'Synced' : syncing ? 'Syncing' : status === 'offline' ? 'Offline' : 'Sync'}</span>
            </div>
          )}
          <Link href="/library/notes/new" className="topbar-tool hidden md:inline-flex"><StickyNote className="h-3.5 w-3.5" /> Note</Link>
          <button onClick={() => setFocusMode(!focusMode)} className={cn('topbar-tool', focusMode && 'topbar-tool--active')} aria-pressed={focusMode}>
            <Focus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Focus</span>
          </button>
          <div className="streak-pill" title={`${streak} day streak`}><Flame className="h-3.5 w-3.5 text-accent" /><span className="tnum text-xs font-semibold">{streak}</span><span className="hidden lg:inline text-[10px]">day</span></div>
          <div className="relative">
            {user ? (
              <>
                <button onClick={() => setOpen((v) => !v)} className="profile-pill" aria-expanded={open}>
                  <div className="profile-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-3.5 w-3.5" />}</div>
                  <span className="hidden max-w-24 truncate text-[11px] font-semibold lg:inline">{user.name?.split(' ')[0] || 'Learner'}</span>
                  <ChevronDown className="h-3 w-3 text-text-faint" />
                </button>
                {open && (
                  <div className="profile-menu">
                    <Link href="/account" onClick={() => setOpen(false)}><UserRound className="h-3.5 w-3.5" />Account</Link>
                    <Link href="/settings" onClick={() => setOpen(false)}><Settings className="h-3.5 w-3.5" />Settings</Link>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" className="topbar-tool topbar-tool--accent"><UserRound className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign in</span></Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

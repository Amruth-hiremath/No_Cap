'use client';

import Link from 'next/link';
import { Search, Flame, Focus, UserRound, ChevronDown, Settings, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useSync } from '@/lib/useSync';
import { useEffect, useRef, useState } from 'react';

export function TopBar() {
  const streak = useStore((s) => s.streak.current);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const user = useStore((s) => s.user);
  const { status } = useSync();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY.current + 8 && y > 100) setHidden(true);
      if (y < lastY.current - 8 || y < 42) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const syncIcon = status === 'syncing'
    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
    : status === 'offline'
      ? <CloudOff className="h-3.5 w-3.5" />
      : <Cloud className="h-3.5 w-3.5" />;
  const syncLabel = status === 'synced'
    ? 'Synced'
    : status === 'syncing'
      ? 'Syncing'
      : status === 'offline'
        ? 'Offline'
        : 'Sync available';

  return (
    <>
      <div className="topbar-reveal-zone" onMouseEnter={() => setHidden(false)} aria-hidden="true" />
      <header className={cn('topbar-shell', hidden && 'topbar-shell--hidden')}>
        <div className="topbar-inner">
          <div className="topbar-core">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="topbar-search"
              aria-label="Open command palette"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">Search concepts, notes…</span>
              <kbd>⌘K</kbd>
            </button>

            <div className="topbar-actions">
              {user && (
                <span
                  className={cn(
                    'sync-mini',
                    status === 'synced' && 'sync-mini--ok',
                    status === 'syncing' && 'sync-mini--busy',
                    status === 'offline' && 'sync-mini--offline',
                  )}
                  title={syncLabel}
                  aria-label={syncLabel}
                >
                  {syncIcon}
                </span>
              )}

              <button
                onClick={() => setFocusMode(!focusMode)}
                className={cn('topbar-icon-btn', focusMode && 'topbar-icon-btn--active')}
                aria-label="Toggle focus mode"
                aria-pressed={focusMode}
                title="Focus mode"
              >
                <Focus className="h-4 w-4" />
              </button>

              {streak > 0 && (
                <div className="streak-pill" title={`${streak} day streak`}>
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  <span className="tnum text-xs font-semibold">{streak}</span>
                </div>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setOpen((value) => !value)}
                    className="profile-pill"
                    aria-expanded={open}
                    aria-label="Open account menu"
                  >
                    <div className="profile-avatar">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                        : <UserRound className="h-3.5 w-3.5" />}
                    </div>
                    <ChevronDown className="h-3 w-3 text-text-faint" />
                  </button>
                  {open && (
                    <div className="profile-menu">
                      <Link href="/account" onClick={() => setOpen(false)}>
                        <UserRound className="h-3.5 w-3.5" />Account
                      </Link>
                      <Link href="/settings" onClick={() => setOpen(false)}>
                        <Settings className="h-3.5 w-3.5" />Settings
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="topbar-signin">
                  <UserRound className="h-3.5 w-3.5" />Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

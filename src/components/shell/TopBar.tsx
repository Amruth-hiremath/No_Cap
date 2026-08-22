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
  const rafId = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal/hide with rAF coalescing — avoids per-pixel state churn.
  useEffect(() => {
    const onScroll = () => {
      if (rafId.current != null) return;
      rafId.current = window.requestAnimationFrame(() => {
        rafId.current = null;
        const y = window.scrollY;
        if (y > lastY.current + 8 && y > 100) setHidden(true);
        if (y < lastY.current - 8 || y < 42) setHidden(false);
        lastY.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId.current != null) window.cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Close the profile dropdown when the user clicks anywhere outside of it.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const node = menuRef.current;
      if (node && !node.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
        : 'Ready';

  return (
    <>
      <div className="topbar-reveal-zone" onMouseEnter={() => setHidden(false)} aria-hidden="true" />
      <header className={cn('topbar-shell', hidden && 'topbar-shell--hidden')}>
        <div className="topbar-inner">
          <div className="topbar-core">
            {/* Mobile-only brand — sidebar is hidden below 768px so the topbar
                must carry the NO CAP mark. Uses the optimized 32px variant. */}
            <Link href="/" className="topbar-mobile-brand" aria-label="NO CAP home">
              <img src="/brand/no-cap-mark-32.png" alt="" width={24} height={24} />
              <span className="topbar-mobile-brand__text">NO CAP</span>
            </Link>

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
                <div className="relative" ref={menuRef}>
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

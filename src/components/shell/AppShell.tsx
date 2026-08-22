'use client';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import dynamic from 'next/dynamic';
const CommandPalette = dynamic(() => import('./CommandPalette').then((m) => m.CommandPalette), { ssr: false, loading: () => null });
import { FocusOverlay } from './FocusOverlay';
import { useStore } from '@/lib/store';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { useAuthBootstrap } from '@/lib/useAuthBootstrap';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface AppShellProps { children: React.ReactNode; }

export function AppShell({ children }: AppShellProps) {
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const tickFocusTimer = useStore((s) => s.tickFocusTimer);
  const focusRunning = useStore((s) => s.focus_session.running);
  const pathname = usePathname();
  const bareAuthPage = pathname === '/login' || pathname === '/onboarding';
  const plainPage = pathname === '/account' || pathname.startsWith('/account/') || pathname === '/settings' || pathname.startsWith('/settings/');

  useKeyboardShortcuts();
  useAuthBootstrap();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useStore.getState().command_palette_open) return void useStore.getState().setCommandPaletteOpen(false);
      if (useStore.getState().focus_mode) setFocusMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setFocusMode]);

  useEffect(() => {
    if (!focusRunning) return;
    const id = setInterval(() => tickFocusTimer(), 1000);
    return () => clearInterval(id);
  }, [focusRunning, tickFocusTimer]);

  if (bareAuthPage) return <>{children}</>;

  return (
    <div className={cn('min-h-screen', plainPage ? 'bg-app' : 'bg-grid', !focusMode && 'pb-16 md:pb-0')} data-focus-mode={focusMode ? 'true' : undefined}>
      {focusMode ? (
        <FocusOverlay>{children}</FocusOverlay>
      ) : (
        <div className="min-h-screen">
          <Sidebar />
          <TopBar />
          <main id="main-content" className="app-main">
            <div className="route-enter mx-auto w-full max-w-7xl px-4 py-7 md:px-8 md:py-10">{children}</div>
          </main>
        </div>
      )}
      <CommandPalette />
      {!focusMode && <BottomNav />}
    </div>
  );
}

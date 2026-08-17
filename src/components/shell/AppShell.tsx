'use client';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { CommandPalette } from './CommandPalette';
import { FocusOverlay } from './FocusOverlay';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const tickFocusTimer = useStore((s) => s.tickFocusTimer);
  const focusRunning = useStore((s) => s.focus_session.running);

  // Escape key — exits focus mode, closes command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (useStore.getState().command_palette_open) {
          useStore.getState().setCommandPaletteOpen(false);
          return;
        }
        if (useStore.getState().focus_mode) {
          setFocusMode(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setFocusMode]);

  // Focus timer tick — 1s
  useEffect(() => {
    if (!focusRunning) return;
    const id = setInterval(() => tickFocusTimer(), 1000);
    return () => clearInterval(id);
  }, [focusRunning, tickFocusTimer]);

  return (
    <div className={cn('min-h-screen bg-grid', !focusMode && 'pb-16 md:pb-0')}>
      {!focusMode && <Sidebar />}
      {!focusMode && <TopBar />}
      <CommandPalette />
      {focusMode && <FocusOverlay>{children}</FocusOverlay>}

      <main
        className={cn(
          'min-h-[calc(100vh-3.5rem)]',
          focusMode ? 'pt-0' : 'md:pl-56 pt-14'
        )}
      >
        <div
          className={cn(
            'mx-auto',
            focusMode
              ? 'max-w-3xl px-5 py-10'
              : 'max-w-5xl px-4 py-8 md:px-8 md:py-10'
          )}
        >
          {children}
        </div>
      </main>

      {!focusMode && <BottomNav />}
    </div>
  );
}

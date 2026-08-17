'use client';

import { useEffect } from 'react';
import { useStore, applyTheme } from '@/lib/store';

/**
 * Keeps <html data-theme> in sync with the user's theme preference
 * whenever it changes (or when the system theme toggles while in
 * 'system' mode).
 */
export function ThemeBootstrap() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return null;
}

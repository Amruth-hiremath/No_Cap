'use client';

import { useEffect } from 'react';
import { useStore, applyTheme } from '@/lib/store';

export function ThemeBootstrap() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}
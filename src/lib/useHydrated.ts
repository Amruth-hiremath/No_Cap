'use client';

import { useState, useEffect } from 'react';

/**
 * useHydrated — returns `true` only after the component has mounted on the client.
 *
 * SSR and the first client render both produce `false`, ensuring identical
 * deterministic markup. Only after `useEffect` fires does this return `true`.
 *
 * This is the correct pattern for reading persisted Zustand/localStorage state:
 * the server can't know what's in localStorage, so we must wait for the client
 * to mount before reading it.
 *
 * Usage:
 * ```tsx
 * const hydrated = useHydrated();
 * const mastery = useStore((s) => s.mastery);
 * // SSR: renders 'not_started' (deterministic)
 * // After mount: renders actual mastery state
 * const state = hydrated ? getMasteryState(slug) : 'not_started';
 * ```
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from './store';
import { apiUrl } from './api';

/**
 * useSync — manages local state vs server state.
 *
 * When authenticated:
 *   1. On mount: fetch /v1/state from server, merge into store.
 *   2. On store change: debounce → POST /v1/state/sync.
 *   3. On offline: queue mutations, retry on reconnect.
 *
 * When anonymous:
 *   localStorage only. No server calls.
 *
 * Usage:
 *   const { status, lastSynced } = useSync();
 */

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export function useSync() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial sync on mount (if authenticated)
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    let cancelled = false;

    (async () => {
      isFetchingRef.current = true;
      setStatus('syncing');
      try {
        const resp = await fetch(apiUrl('/v1/state'), { credentials: 'include' });
        if (!resp.ok) throw new Error('Failed to fetch state');
        const data = await resp.json();
        if (!cancelled && data) {
          const local = useStore.getState();
          const serverMastery = data.mastery || {};
          const serverNotes = data.notes || [];
          const serverHighlights = data.highlights || [];
          const serverBookmarks = data.bookmarks || [];
          const serverAttempts = data.attempts || [];
          const serverHasState =
            Object.keys(serverMastery).length > 0 ||
            serverNotes.length > 0 ||
            serverHighlights.length > 0 ||
            serverBookmarks.length > 0 ||
            serverAttempts.length > 0 ||
            Object.keys(data.review_items || {}).length > 0;

          if (serverHasState) {
            // Server state is authoritative for an existing account. Keep any
            // local-only notes/highlights/bookmarks that don't exist remotely so
            // a fresh sign-in doesn't silently discard work from this device.
            const byId = <T extends { id: string }>(a: T[], b: T[]) => {
              const map = new Map<string, T>();
              [...a, ...b].forEach((item) => map.set(item.id, item));
              return Array.from(map.values());
            };
            local.$setState({
              mastery: serverMastery,
              review_items: data.review_items || {},
              attempts: byId(serverAttempts, local.attempts),
              notes: byId(serverNotes, local.notes),
              highlights: byId(serverHighlights, local.highlights),
              bookmarks: byId(serverBookmarks, local.bookmarks),
              confusing_concepts: data.confusing_concepts || local.confusing_concepts,
              streak: data.streak || local.streak,
              last_visited_positions: { ...(data.last_visited_positions || {}), ...local.last_visited_positions },
            });
          } else {
            // First sign-in on a device: preserve anonymous local progress and
            // immediately upload it so the account becomes the source of truth.
            await fetch(apiUrl('/v1/state/sync'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mastery: local.mastery,
                review_items: local.review_items,
                attempts: local.attempts,
                notes: local.notes,
                highlights: local.highlights,
                bookmarks: local.bookmarks,
                confusing_concepts: local.confusing_concepts,
                streak: local.streak,
                last_visited_positions: local.last_visited_positions,
              }),
              credentials: 'include',
            });
          }
          setStatus('synced');
          setLastSynced(new Date().toISOString());
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(navigator.onLine ? 'error' : 'offline');
        }
      } finally {
        isFetchingRef.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  // Debounced sync on store changes (if authenticated)
  const triggerSync = useCallback(() => {
    if (!isAuthenticated || isFetchingRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      setStatus('syncing');
      try {
        const store = useStore.getState();
        const payload = {
          mastery: store.mastery,
          review_items: store.review_items,
          notes: store.notes,
          highlights: store.highlights,
          bookmarks: store.bookmarks,
          confusing_concepts: store.confusing_concepts,
          streak: store.streak,
          last_visited_positions: store.last_visited_positions,
        };
        const resp = await fetch(apiUrl('/v1/state/sync'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        if (!resp.ok) throw new Error('Sync failed');
        setStatus('synced');
        setLastSynced(new Date().toISOString());
      } catch (err) {
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, 3000); // 3s debounce
  }, [isAuthenticated]);

  // Listen for online/offline events
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    const onOnline = () => {
      setStatus('syncing');
      triggerSync();
    };
    const onOffline = () => setStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [mounted, isAuthenticated, triggerSync]);

  return { status: mounted ? status : 'idle', lastSynced, triggerSync };
}

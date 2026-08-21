'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from './store';
import { apiUrl } from './api';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

let bootstrapPromise: Promise<void> | null = null;
let bootstrapUserId: number | null = null;
let globalSubscribed = false;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncStartedAt = 0;
let lastStatus: SyncStatus = 'idle';
const listeners = new Set<(status: SyncStatus, at: string | null) => void>();

function publish(status: SyncStatus) {
  lastStatus = status;
  for (const fn of listeners) fn(status, status === 'synced' ? new Date().toISOString() : null);
}

function syncPayload(s: ReturnType<typeof useStore.getState>) {
  return {
    mastery: s.mastery,
    review_items: s.review_items,
    attempts: s.attempts.slice(0, 500),
    notes: s.notes.slice(0, 500),
    highlights: s.highlights.slice(0, 800),
    bookmarks: s.bookmarks.slice(0, 500),
    confusing_concepts: s.confusing_concepts.slice(0, 500),
    streak: s.streak,
    last_visited_positions: s.last_visited_positions,
    workspace_notes: s.workspace_notes.slice(0, 100),
  };
}

async function performSync() {
  const now = Date.now();
  if (now - lastSyncStartedAt < 12000) return;
  if (!useStore.getState().isAuthenticated) return;
  lastSyncStartedAt = now;
  publish('syncing');
  try {
    const resp = await fetch(apiUrl('/v1/state/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload(useStore.getState())),
      credentials: 'include',
      keepalive: true,
    });
    if (!resp.ok) throw new Error(`Sync failed: ${resp.status}`);
    publish('synced');
  } catch {
    publish(navigator.onLine ? 'error' : 'offline');
  }
}

function scheduleSync() {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => { pendingTimer = null; void performSync(); }, 8000);
}

async function bootstrap() {
  const userId = useStore.getState().user?.id ?? null;
  if (!userId || !useStore.getState().isAuthenticated) return;
  if (bootstrapPromise && bootstrapUserId === userId) return bootstrapPromise;
  bootstrapUserId = userId;
  bootstrapPromise = (async () => {
    publish('syncing');
    try {
      const resp = await fetch(apiUrl('/v1/state'), { credentials: 'include', cache: 'no-store' });
      if (!resp.ok) throw new Error('Failed to fetch state');
      const data = await resp.json();
      const local = useStore.getState();
      const serverHasState = Object.keys(data.mastery ?? {}).length || Object.keys(data.review_items ?? {}).length || (data.notes?.length ?? 0) || (data.workspace_notes?.length ?? 0);
      if (serverHasState) {
        const byId = <T extends { id: string }>(a: T[], b: T[]) => { const map = new Map<string, T>(); [...a, ...b].forEach((item) => map.set(item.id, item)); return [...map.values()]; };
        local.$setState({
          mastery: data.mastery ?? {},
          review_items: data.review_items ?? {},
          attempts: byId(data.attempts ?? [], local.attempts),
          notes: byId(data.notes ?? [], local.notes),
          highlights: byId(data.highlights ?? [], local.highlights),
          bookmarks: byId(data.bookmarks ?? [], local.bookmarks),
          workspace_notes: data.workspace_notes?.length ? data.workspace_notes : local.workspace_notes,
          confusing_concepts: data.confusing_concepts ?? local.confusing_concepts,
          streak: data.streak ?? local.streak,
          last_visited_positions: { ...(data.last_visited_positions ?? {}), ...local.last_visited_positions },
        });
      } else {
        await performSync();
      }
      publish('synced');
    } catch {
      publish(navigator.onLine ? 'error' : 'offline');
    }
  })().finally(() => { bootstrapPromise = null; });
  return bootstrapPromise;
}

export function useSync() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<SyncStatus>(lastStatus);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerSync = useCallback(() => scheduleSync(), []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    const onStatus = (next: SyncStatus, at: string | null) => { setStatus(next); if (at) setLastSynced(at); };
    listeners.add(onStatus);
    void bootstrap();
    if (!globalSubscribed) {
      globalSubscribed = true;
      useStore.subscribe((state, prev) => {
        if (!state.isAuthenticated) return;
        if (state.mastery !== prev.mastery || state.review_items !== prev.review_items || state.attempts !== prev.attempts || state.notes !== prev.notes || state.highlights !== prev.highlights || state.bookmarks !== prev.bookmarks || state.workspace_notes !== prev.workspace_notes || state.confusing_concepts !== prev.confusing_concepts || state.streak !== prev.streak) {
          scheduleSync();
        }
      });
    }
    return () => { listeners.delete(onStatus); };
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    const onOnline = () => { if (useStore.getState().isAuthenticated) scheduleSync(); };
    const onOffline = () => publish('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  return { status: mounted ? status : 'idle', lastSynced, triggerSync };
}

/* ═══════════════════════════════════════════════════════════════════
   NO CAP store — Zustand + localStorage.

   v0.1 is local-only. State is shaped around explicit domain events
   so the mastery lifecycle is explainable. No mutations inside render.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MasteryRecord,
  ReviewItem,
  AttemptRecord,
  LearningEvent,
  MasteryState,
  FocusDuration,
  Note,
  Highlight,
  Bookmark,
} from './types';
import { computeMasteryState } from './mastery';
import { scheduleNextReview, qualityFromScore } from './review-scheduler';

interface StoreState {
  /* Identity */
  isAuthenticated: boolean;
  user: { id: number; github_id?: string; email: string; name?: string; avatar_url?: string; auth_provider?: 'google' | 'github'; timezone: string; onboarding_completed?: boolean; goals?: string[]; weekly_minutes?: number } | null;
  auth_loaded: boolean;

  /* Mastery */
  mastery: Record<string, MasteryRecord>;

  /* Review */
  review_items: Record<string, ReviewItem>;

  /* Attempts */
  attempts: AttemptRecord[];

  /* Events (capped at 1000) */
  events: LearningEvent[];

  /* Streak */
  streak: { current: number; longest: number; last_active: string; recovery_tokens: number };

  /* UI state */
  focus_mode: boolean;
  focus_session: { duration: FocusDuration; remaining: number; running: boolean; started_at: string | null; concept_slug: string | null };
  last_visited_concept: string | null;
  last_visited_positions: Record<string, number>;
  command_palette_open: boolean;
  theme: 'system' | 'light' | 'dark' | 'sage' | 'sand' | 'slate' | 'forest' | 'charcoal' | 'clay' | 'olive' | 'mist';
  /** Tracks concepts exposed this browser session to avoid duplicate writes. */
  exposed_session: string[];

  /* Notes / Highlights / Bookmarks */
  notes: Note[];
  highlights: Highlight[];
  bookmarks: Bookmark[];

  /* Confusing concepts — concept slugs the user marked as confusing */
  confusing_concepts: string[];

  /* Actions — domain events */
  startConcept: (concept_slug: string) => void;
  markConceptUnderstood: (concept_slug: string) => void;
  recordQuizAttempt: (concept_slug: string, ref_id: string, score: number, response: unknown) => void;
  recordScenarioAttempt: (concept_slug: string, ref_id: string, score: number, response: unknown) => void;
  recordReview: (concept_slug: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  setLastVisitedPosition: (concept_slug: string, position: number) => void;
  getLastVisitedPosition: (concept_slug: string) => number;

  /* Notes actions */
  addNote: (concept_slug: string, title: string, body: string, block_id?: string, selected_text?: string, anchor_start?: number, anchor_end?: number) => string;
  updateNote: (id: string, title: string, body: string) => void;
  deleteNote: (id: string) => void;
  getNotesForConcept: (concept_slug: string) => Note[];

  /* Highlights actions */
  addHighlight: (concept_slug: string, block_id: string, selected_text: string, color: Highlight['color']) => string;
  removeHighlight: (id: string) => void;
  getHighlightsForConcept: (concept_slug: string) => Highlight[];

  /* Bookmarks actions */
  addBookmark: (concept_slug: string, label: string, block_id?: string) => void;
  removeBookmark: (id: string) => void;
  getBookmarksForConcept: (concept_slug: string) => Bookmark[];

  /* Confusing concepts */
  toggleConfusing: (concept_slug: string) => void;
  isConfusing: (concept_slug: string) => boolean;

  /* Focus mode */
  setFocusMode: (on: boolean) => void;
  startFocusTimer: (duration: FocusDuration, concept_slug?: string) => void;
  tickFocusTimer: () => void;
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  stopFocusTimer: () => void;

  /* Command palette */
  setCommandPaletteOpen: (open: boolean) => void;

  /* Theme */
  setTheme: (theme: 'system' | 'light' | 'dark' | 'sage' | 'sand' | 'slate' | 'forest' | 'charcoal' | 'clay' | 'olive' | 'mist') => void;
  resetLearningProgress: () => void;

  /* Account */
  setAuthState: (user: StoreState['user'] | null) => void;
  setOnboarding: (payload: { completed?: boolean; goals?: string[]; weekly_minutes?: number }) => void;
  signIn: () => void;
  signOut: () => void;

  /* Bulk state set (for sync) */
  $setState: (partial: Partial<StoreState>) => void;

  /* Derived */
  getDueReviews: () => ReviewItem[];
  getMasteryState: (concept_slug: string) => MasteryState;
}

/* ── Time helpers (timezone-aware) ──────────────────────────────── */

function userTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Returns YYYY-MM-DD in the given IANA timezone. */
function dateInTz(date: Date, tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function todayKey(): string {
  return dateInTz(new Date(), userTimezone());
}

function yesterdayKey(): string {
  return dateInTz(new Date(Date.now() - 86_400_000), userTimezone());
}

function updateStreak(streak: StoreState['streak']): StoreState['streak'] {
  const today = todayKey();
  if (streak.last_active === today) return streak;

  if (streak.last_active === yesterdayKey()) {
    const next = streak.current + 1;
    return {
      ...streak,
      current: next,
      longest: Math.max(streak.longest, next),
      last_active: today,
    };
  }

  // Streak broken — try recovery
  if (streak.recovery_tokens > 0) {
    const next = streak.current + 1;
    return {
      ...streak,
      current: next,
      longest: Math.max(streak.longest, next),
      last_active: today,
      recovery_tokens: streak.recovery_tokens - 1,
    };
  }

  return {
    ...streak,
    current: 1,
    longest: Math.max(streak.longest, 1),
    last_active: today,
  };
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function pushEvent(events: LearningEvent[], evt: Omit<LearningEvent, 'id' | 'created_at'>): LearningEvent[] {
  return [{ ...evt, id: genId('evt'), created_at: nowISO() }, ...events].slice(0, 1000);
}

/* ── Default focus session ───────────────────────────────────────── */

const DEFAULT_FOCUS_SESSION: StoreState['focus_session'] = {
  duration: 25,
  remaining: 25 * 60,
  running: false,
  started_at: null,
  concept_slug: null,
};

/* ═══════════════════════════════════════════════════════════════════
   Store
   ═══════════════════════════════════════════════════════════════════ */

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      auth_loaded: false,
      mastery: {},
      review_items: {},
      attempts: [],
      events: [],
      streak: { current: 0, longest: 0, last_active: '', recovery_tokens: 3 },
      focus_mode: false,
      focus_session: DEFAULT_FOCUS_SESSION,
      last_visited_concept: null,
      last_visited_positions: {},
      command_palette_open: false,
      theme: 'system',
      exposed_session: [],
      notes: [],
      highlights: [],
      bookmarks: [],
      confusing_concepts: [],

      /* ── startConcept: records exposure exactly once ───────────── */
      startConcept: (concept_slug) =>
        set((state) => {
          if (state.exposed_session.includes(concept_slug)) {
            // Already exposed this browser session — just touch streak if a new day.
            const today = todayKey();
            if (state.streak.last_active !== today) {
              return { ...state, streak: updateStreak(state.streak) };
            }
            return state;
          }

          const existing = state.mastery[concept_slug];
          const record: MasteryRecord =
            existing && existing.state !== 'not_started'
              ? existing
              : {
                  concept_slug,
                  learn_score: existing?.learn_score ?? 0.15,
                  recall_score: existing?.recall_score ?? 0,
                  apply_score: existing?.apply_score ?? 0,
                  explain_score: existing?.explain_score ?? 0,
                  interview_score: existing?.interview_score ?? 0,
                  state: 'exposed',
                  updated_at: nowISO(),
                };

          return {
            ...state,
            mastery: { ...state.mastery, [concept_slug]: record },
            exposed_session: [...state.exposed_session, concept_slug],
            last_visited_concept: concept_slug,
            streak: updateStreak(state.streak),
            events: pushEvent(state.events, {
              type: 'concept_started',
              concept_slug,
              payload_json: JSON.stringify({ at: nowISO() }),
            }),
          };
        }),

      /* ── markConceptUnderstood ──────────────────────────────────── */
      markConceptUnderstood: (concept_slug) =>
        set((state) => {
          const existing = state.mastery[concept_slug];
          const record: MasteryRecord = {
            concept_slug,
            learn_score: Math.max(existing?.learn_score ?? 0, 0.7),
            recall_score: existing?.recall_score ?? 0,
            apply_score: existing?.apply_score ?? 0,
            explain_score: existing?.explain_score ?? 0,
            interview_score: existing?.interview_score ?? 0,
            state: 'understood',
            updated_at: nowISO(),
          };
          return {
            ...state,
            mastery: { ...state.mastery, [concept_slug]: record },
            streak: updateStreak(state.streak),
            events: pushEvent(state.events, {
              type: 'concept_understood',
              concept_slug,
              payload_json: JSON.stringify({}),
            }),
          };
        }),

      /* ── recordQuizAttempt ──────────────────────────────────────── */
      recordQuizAttempt: (concept_slug, ref_id, score, response) =>
        set((state) => {
          const attempt: AttemptRecord = {
            id: genId('att'),
            type: 'quiz',
            ref_id,
            concept_slug,
            score,
            response_json: JSON.stringify(response),
            created_at: nowISO(),
          };

          const existing = state.mastery[concept_slug];
          const quizScores = state.attempts
            .filter((a) => a.concept_slug === concept_slug && a.type === 'quiz')
            .map((a) => a.score)
            .concat(score);
          const avgQuiz = quizScores.reduce((s, x) => s + x, 0) / Math.max(quizScores.length, 1);

          const baseLearn = Math.max(existing?.learn_score ?? 0.3, 0.5);
          const baseRecall = existing?.recall_score ?? 0;

          const newMastery: MasteryRecord = {
            concept_slug,
            learn_score: baseLearn,
            recall_score: Math.max(baseRecall, avgQuiz),
            apply_score: existing?.apply_score ?? 0,
            explain_score: existing?.explain_score ?? 0,
            interview_score: existing?.interview_score ?? 0,
            state: existing?.state ?? 'exposed',
            updated_at: nowISO(),
          };

          const quality = qualityFromScore(score);
          const reviewItem = scheduleNextReview(
            state.review_items[concept_slug],
            concept_slug,
            quality
          );

          newMastery.state = computeMasteryState(newMastery, reviewItem);

          return {
            ...state,
            attempts: [attempt, ...state.attempts].slice(0, 500),
            mastery: { ...state.mastery, [concept_slug]: newMastery },
            review_items: { ...state.review_items, [concept_slug]: reviewItem },
            streak: updateStreak(state.streak),
            events: pushEvent(state.events, {
              type: 'quiz_attempt',
              concept_slug,
              payload_json: JSON.stringify({ score, ref_id }),
            }),
          };
        }),

      /* ── recordScenarioAttempt ─────────────────────────────────── */
      recordScenarioAttempt: (concept_slug, ref_id, score, response) =>
        set((state) => {
          const attempt: AttemptRecord = {
            id: genId('att'),
            type: 'scenario',
            ref_id,
            concept_slug,
            score,
            response_json: JSON.stringify(response),
            created_at: nowISO(),
          };

          const existing = state.mastery[concept_slug];
          const newMastery: MasteryRecord = {
            concept_slug,
            learn_score: existing?.learn_score ?? 0.5,
            recall_score: existing?.recall_score ?? 0,
            apply_score: Math.max(existing?.apply_score ?? 0, score),
            explain_score: existing?.explain_score ?? 0,
            interview_score: existing?.interview_score ?? 0,
            state: existing?.state ?? 'exposed',
            updated_at: nowISO(),
          };

          const quality = qualityFromScore(score);
          const reviewItem = scheduleNextReview(
            state.review_items[concept_slug],
            concept_slug,
            quality
          );

          newMastery.state = computeMasteryState(newMastery, reviewItem);

          return {
            ...state,
            attempts: [attempt, ...state.attempts].slice(0, 500),
            mastery: { ...state.mastery, [concept_slug]: newMastery },
            review_items: { ...state.review_items, [concept_slug]: reviewItem },
            streak: updateStreak(state.streak),
            events: pushEvent(state.events, {
              type: 'scenario_attempt',
              concept_slug,
              payload_json: JSON.stringify({ score, ref_id }),
            }),
          };
        }),

      /* ── recordReview (confidence-based) ─────────────────────────── */
      recordReview: (concept_slug, quality) =>
        set((state) => {
          const prior = state.review_items[concept_slug];
          const reviewItem = scheduleNextReview(prior, concept_slug, quality);

          const existing = state.mastery[concept_slug];
          const newRecall =
            existing && existing.recall_score > 0
              ? Math.min(1, Math.max(0, existing.recall_score + (quality >= 3 ? 0.1 : -0.15)))
              : quality >= 3
                ? 0.5
                : 0.15;

          const newMastery: MasteryRecord = existing
            ? {
                ...existing,
                recall_score: newRecall,
                updated_at: nowISO(),
              }
            : {
                concept_slug,
                learn_score: 0.5,
                recall_score: newRecall,
                apply_score: 0,
                explain_score: 0,
                interview_score: 0,
                state: 'practiced',
                updated_at: nowISO(),
              };
          newMastery.state = computeMasteryState(newMastery, reviewItem);

          return {
            ...state,
            review_items: { ...state.review_items, [concept_slug]: reviewItem },
            mastery: { ...state.mastery, [concept_slug]: newMastery },
            streak: updateStreak(state.streak),
            events: pushEvent(state.events, {
              type: 'review_answer',
              concept_slug,
              payload_json: JSON.stringify({ quality, prior_interval: prior?.interval_days }),
            }),
          };
        }),

      /* ── last-visited position (debounced by caller) ────────────── */
      setLastVisitedPosition: (concept_slug, position) =>
        set((s) => ({
          last_visited_concept: concept_slug,
          last_visited_positions: { ...s.last_visited_positions, [concept_slug]: position },
        })),

      getLastVisitedPosition: (concept_slug) => {
        const positions = get().last_visited_positions;
        return positions[concept_slug] ?? 0;
      },

      /* ── Notes ──────────────────────────────────────────────────── */
      addNote: (concept_slug, title, body, block_id, selected_text, anchor_start, anchor_end) => {
        const id = genId('note');
        const now = nowISO();
        set((s) => ({
          notes: [
            { id, concept_slug, block_id, selected_text, anchor_start, anchor_end, title, body, created_at: now, updated_at: now },
            ...s.notes,
          ],
        }));
        return id;
      },

      updateNote: (id, title, body) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, title, body, updated_at: nowISO() } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      getNotesForConcept: (concept_slug) =>
        get().notes.filter((n) => n.concept_slug === concept_slug),

      /* ── Highlights ──────────────────────────────────────────────── */
      addHighlight: (concept_slug, block_id, selected_text, color) => {
        const id = genId('hl');
        set((s) => ({
          highlights: [{ id, concept_slug, block_id, selected_text, color, created_at: nowISO() }, ...s.highlights],
        }));
        return id;
      },

      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

      getHighlightsForConcept: (concept_slug) =>
        get().highlights.filter((h) => h.concept_slug === concept_slug),

      /* ── Bookmarks ───────────────────────────────────────────────── */
      addBookmark: (concept_slug, label, block_id) =>
        set((s) => ({
          bookmarks: [
            {
              id: genId('bm'),
              concept_slug,
              block_id,
              label,
              created_at: nowISO(),
            },
            ...s.bookmarks,
          ],
        })),

      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

      getBookmarksForConcept: (concept_slug) =>
        get().bookmarks.filter((b) => b.concept_slug === concept_slug),

      /* ── Confusing concepts ───────────────────────────────────────── */
      toggleConfusing: (concept_slug) =>
        set((s) => ({
          confusing_concepts: s.confusing_concepts.includes(concept_slug)
            ? s.confusing_concepts.filter((c) => c !== concept_slug)
            : [concept_slug, ...s.confusing_concepts],
        })),

      isConfusing: (concept_slug) => get().confusing_concepts.includes(concept_slug),

      /* ── Focus mode ──────────────────────────────────────────────── */
      setFocusMode: (on) => set({ focus_mode: on }),

      startFocusTimer: (duration, concept_slug) =>
        set({
          focus_session: {
            duration,
            remaining: duration * 60,
            running: true,
            started_at: nowISO(),
            concept_slug: concept_slug ?? null,
          },
          events: pushEvent(get().events, {
            type: 'focus_session',
            concept_slug: concept_slug ?? null,
            payload_json: JSON.stringify({ duration, started_at: nowISO() }),
          }),
        }),

      tickFocusTimer: () =>
        set((state) => {
          if (!state.focus_session.running) return state;
          const next = Math.max(0, state.focus_session.remaining - 1);
          if (next === 0) {
            return {
              ...state,
              focus_session: {
                ...state.focus_session,
                remaining: 0,
                running: false,
                started_at: null,
              },
            };
          }
          return {
            ...state,
            focus_session: { ...state.focus_session, remaining: next },
          };
        }),

      pauseFocusTimer: () =>
        set((state) => ({
          ...state,
          focus_session: { ...state.focus_session, running: false },
        })),

      resumeFocusTimer: () =>
        set((state) => ({
          ...state,
          focus_session: { ...state.focus_session, running: true },
        })),

      stopFocusTimer: () =>
        set({
          focus_session: { ...DEFAULT_FOCUS_SESSION },
        }),

      /* ── Command palette & theme ────────────────────────────────── */
      setCommandPaletteOpen: (open) => set({ command_palette_open: open }),

      setTheme: (theme) => set({ theme }),
      resetLearningProgress: () => set({
        mastery: {},
        review_items: {},
        attempts: [],
        events: [],
        streak: { current: 0, longest: 0, last_active: '', recovery_tokens: 0 },
        last_visited_concept: null,
        last_visited_positions: {},
        exposed_session: [],
        confusing_concepts: [],
        focus_session: { duration: 25, remaining: 25 * 60, running: false, started_at: null, concept_slug: null },
      }),

      /* ── Auth ─────────────────────────────────────────────────────── */
      setAuthState: (user) => set((state) => {
        const previousId = state.user?.id ?? null;
        const nextId = user?.id ?? null;
        // Prevent cross-account leakage when switching authenticated users.
        // Anonymous local progress is retained on the first sign-in so it can be
        // merged into the new account during initial sync. Once an authenticated
        // user switches or signs out, account-owned learning state is cleared and
        // will be restored from D1 on the next sign-in.
        const switchedAccount = Boolean(previousId && nextId && previousId !== nextId);
        const signedOut = Boolean(previousId && !nextId);
        if (switchedAccount || signedOut) {
          return {
            ...state,
            isAuthenticated: Boolean(user),
            user,
            auth_loaded: true,
            mastery: {},
            review_items: {},
            attempts: [],
            events: [],
            streak: { current: 0, longest: 0, last_active: '', recovery_tokens: 3 },
            last_visited_concept: null,
            last_visited_positions: {},
            notes: [],
            highlights: [],
            bookmarks: [],
            confusing_concepts: [],
            exposed_session: [],
          };
        }
        return { ...state, isAuthenticated: Boolean(user), user, auth_loaded: true };
      }),
      setOnboarding: (payload) => set((state) => ({
        user: state.user ? { ...state.user, ...payload, onboarding_completed: payload.completed ?? state.user.onboarding_completed } : state.user,
      })),
      signIn: () => set({ auth_loaded: true }),
      signOut: () => {
        // Cloud data is authoritative after sign-in, so remove account-owned
        // client state before the session ends.
        set((state) => ({
          ...state,
          isAuthenticated: false,
          user: null,
          auth_loaded: true,
          mastery: {},
          review_items: {},
          attempts: [],
          events: [],
          streak: { current: 0, longest: 0, last_active: '', recovery_tokens: 3 },
          last_visited_concept: null,
          last_visited_positions: {},
          notes: [],
          highlights: [],
          bookmarks: [],
          confusing_concepts: [],
          exposed_session: [],
        }));
      },

      $setState: (partial) => set((s) => ({ ...s, ...partial })),

      /* ── Derived ─────────────────────────────────────────────────── */
      getDueReviews: () => {
        const now = new Date();
        return Object.values(get().review_items).filter(
          (r) => new Date(r.due_at) <= now
        );
      },

      getMasteryState: (concept_slug) => {
        const m = get().mastery[concept_slug];
        const r = get().review_items[concept_slug];
        if (!m) return 'not_started';
        return computeMasteryState(m, r);
      },
    }),
    {
      name: 'nocap-state-v0.2',
      version: 2,
      partialize: (s) => ({
        mastery: s.mastery,
        review_items: s.review_items,
        attempts: s.attempts,
        events: s.events,
        streak: s.streak,
        focus_mode: s.focus_mode,
        last_visited_concept: s.last_visited_concept,
        last_visited_positions: s.last_visited_positions,
        notes: s.notes,
        highlights: s.highlights,
        bookmarks: s.bookmarks,
        confusing_concepts: s.confusing_concepts,
        theme: s.theme,
        // exposed_session deliberately NOT persisted — we want a fresh
        // exposure count on each app launch.
      }),
    }
  )
);

/* ── Theme application ──────────────────────────────────────────────
   Applies `data-theme` to <html>. Mirrors the user preference, with
   system fallback. Runs in a single hook (useThemeBootstrap) to avoid
   hydration flash. */

export function applyTheme(theme: StoreState['theme']) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  let resolved = theme;
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = ['dark','charcoal'].includes(resolved) ? 'dark' : 'light';
}

export function userTimezoneLabel(): string {
  return userTimezone();
}

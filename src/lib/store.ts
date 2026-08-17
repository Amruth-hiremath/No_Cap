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
} from './types';
import { computeMasteryState } from './mastery';
import { scheduleNextReview, qualityFromScore } from './review-scheduler';

interface StoreState {
  /* Identity */
  isAuthenticated: boolean;
  user: { id: number; github_id: string; email: string; timezone: string } | null;

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
  last_visited_position: number;
  command_palette_open: boolean;
  theme: 'system' | 'light' | 'dark';
  /** Tracks concepts exposed this browser session to avoid duplicate writes. */
  exposed_session: string[];

  /* Actions — domain events */
  startConcept: (concept_slug: string) => void;
  markConceptUnderstood: (concept_slug: string) => void;
  recordQuizAttempt: (concept_slug: string, ref_id: string, score: number, response: unknown) => void;
  recordScenarioAttempt: (concept_slug: string, ref_id: string, score: number, response: unknown) => void;
  recordReview: (concept_slug: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  setLastVisitedPosition: (concept_slug: string, position: number) => void;

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
  setTheme: (theme: 'system' | 'light' | 'dark') => void;

  /* Account */
  signIn: () => void;
  signOut: () => void;

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
      mastery: {},
      review_items: {},
      attempts: [],
      events: [],
      streak: { current: 0, longest: 0, last_active: '', recovery_tokens: 3 },
      focus_mode: false,
      focus_session: DEFAULT_FOCUS_SESSION,
      last_visited_concept: null,
      last_visited_position: 0,
      command_palette_open: false,
      theme: 'system',
      exposed_session: [],

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
        set({
          last_visited_concept: concept_slug,
          last_visited_position: position,
        }),

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

      /* ── Auth (local-only in v0.1) ───────────────────────────────── */
      signIn: () =>
        set({
          isAuthenticated: true,
          user: {
            id: 1,
            github_id: 'local',
            email: 'you@local.nocap',
            timezone: userTimezone(),
          },
        }),

      signOut: () => set({ isAuthenticated: false, user: null }),

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
        isAuthenticated: s.isAuthenticated,
        user: s.user,
        mastery: s.mastery,
        review_items: s.review_items,
        attempts: s.attempts,
        events: s.events,
        streak: s.streak,
        focus_mode: s.focus_mode,
        last_visited_concept: s.last_visited_concept,
        last_visited_position: s.last_visited_position,
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

export function applyTheme(theme: 'system' | 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  let resolved: 'light' | 'dark';
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = theme;
  }
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
}

export function userTimezoneLabel(): string {
  return userTimezone();
}

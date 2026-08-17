/* ═══════════════════════════════════════════════════════════════════
   Mastery algorithm — deterministic & explainable.
   5 dimensions: Learn, Recall, Apply, Explain, Interview.
   See Backend Blueprint §8 for the full spec.
   ═══════════════════════════════════════════════════════════════════ */

import type { MasteryRecord, ReviewItem, MasteryState } from './types';

export const MASTERY_DIMENSIONS = [
  { key: 'learn', label: 'Learn', weight: 0.2 },
  { key: 'recall', label: 'Recall', weight: 0.3 },
  { key: 'apply', label: 'Apply', weight: 0.3 },
  { key: 'explain', label: 'Explain', weight: 0.1 },
  { key: 'interview', label: 'Interview', weight: 0.1 },
] as const;

export type MasteryDimensionKey = (typeof MASTERY_DIMENSIONS)[number]['key'];

export function dimensionScore(m: MasteryRecord, key: MasteryDimensionKey): number {
  switch (key) {
    case 'learn':
      return m.learn_score;
    case 'recall':
      return m.recall_score;
    case 'apply':
      return m.apply_score;
    case 'explain':
      return m.explain_score;
    case 'interview':
      return m.interview_score;
  }
}

export function computeMasteryScore(m: MasteryRecord): number {
  return (
    MASTERY_DIMENSIONS.reduce(
      (sum, d) => sum + dimensionScore(m, d.key) * d.weight,
      0
    )
  );
}

export function computeMasteryState(
  m: MasteryRecord,
  r?: ReviewItem
): MasteryState {
  // Review due takes precedence when actually overdue
  if (r && new Date(r.due_at) <= new Date()) {
    const score = computeMasteryScore(m);
    if (score < 0.85 || m.apply_score < 0.8) {
      return 'review_due';
    }
  }

  if (m.apply_score >= 0.8 && computeMasteryScore(m) >= 0.85) {
    return 'mastered';
  }
  if (m.apply_score >= 0.7) {
    return 'applied';
  }
  if (m.recall_score >= 0.7) {
    return 'practiced';
  }
  if (m.learn_score >= 0.7) {
    return 'understood';
  }
  if (m.learn_score > 0) {
    return 'exposed';
  }
  return 'not_started';
}

/**
 * Suggested next practice dimension for a concept.
 * Picks the lowest non-zero dimension, favouring Recall → Apply.
 */
export function suggestNextDimension(m: MasteryRecord | undefined): MasteryDimensionKey | null {
  if (!m) return 'learn';
  const order: MasteryDimensionKey[] = ['recall', 'apply', 'explain', 'interview'];
  for (const k of order) {
    const v = dimensionScore(m, k);
    if (v < 0.6) return k;
  }
  return null;
}

export const MASTERY_STATE_META: Record<
  MasteryState,
  { label: string; dot: string; bar: string; text: string; bg: string; rank: number }
> = {
  not_started: {
    label: 'Not started',
    dot: 'bg-border-strong',
    bar: 'bg-border',
    text: 'text-muted',
    bg: 'bg-surface-subtle',
    rank: 0,
  },
  exposed: {
    label: 'Exposed',
    dot: 'bg-accent',
    bar: 'bg-accent',
    text: 'text-accent',
    bg: 'bg-accent-soft',
    rank: 1,
  },
  understood: {
    label: 'Understood',
    dot: 'bg-accent',
    bar: 'bg-accent',
    text: 'text-accent',
    bg: 'bg-accent-soft',
    rank: 2,
  },
  practiced: {
    label: 'Practiced',
    dot: 'bg-accent',
    bar: 'bg-accent',
    text: 'text-accent',
    bg: 'bg-accent-soft',
    rank: 3,
  },
  applied: {
    label: 'Applied',
    dot: 'bg-success',
    bar: 'bg-success',
    text: 'text-success',
    bg: 'bg-success-soft',
    rank: 4,
  },
  review_due: {
    label: 'Review due',
    dot: 'bg-warning',
    bar: 'bg-warning',
    text: 'text-warning',
    bg: 'bg-warning-soft',
    rank: 2.5,
  },
  mastered: {
    label: 'Mastered',
    dot: 'bg-success',
    bar: 'bg-success',
    text: 'text-success',
    bg: 'bg-success-soft',
    rank: 6,
  },
};

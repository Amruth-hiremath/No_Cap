/* ═══════════════════════════════════════════════════════════════════
   Spaced review scheduler (simplified SM-2-like).
   See Backend Blueprint §10. Captures prior interval before scheduling.
   ═══════════════════════════════════════════════════════════════════ */

import type { ReviewItem } from './types';

export function scheduleNextReview(
  existing: ReviewItem | undefined,
  concept_slug: string,
  quality: 0 | 1 | 2 | 3 | 4 | 5
): ReviewItem {
  const now = new Date();
  const prior_interval_days = existing?.interval_days;

  // Quality 0-1: forgot / incorrect -> reset to short interval.
  if (quality <= 1) {
    return {
      concept_slug,
      due_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // +1h
      interval_days: 0.04,
      ease: Math.max(1.3, (existing?.ease ?? 2.5) - 0.2),
      repetitions: 0,
      last_quality: quality,
      prior_interval_days,
    };
  }

  const repetitions = (existing?.repetitions ?? 0) + 1;
  let ease = existing?.ease ?? 2.5;

  if (quality === 2) ease = Math.max(1.3, ease - 0.15);
  if (quality === 5) ease = Math.min(2.8, ease + 0.15);

  let interval_days: number;
  if (repetitions === 1) {
    interval_days = quality === 5 ? 3 : quality >= 3 ? 1 : 0.4;
  } else if (repetitions === 2) {
    interval_days = quality === 5 ? 7 : quality >= 3 ? 4 : 1;
  } else {
    interval_days = Math.round((existing?.interval_days ?? 1) * ease * 10) / 10;
  }

  if (quality === 2) {
    interval_days = Math.max(0.4, Math.round(interval_days * 0.6 * 10) / 10);
  }

  const due_at = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);

  return {
    concept_slug,
    due_at: due_at.toISOString(),
    interval_days,
    ease,
    repetitions,
    last_quality: quality,
    prior_interval_days,
  };
}

export function qualityFromScore(score: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (score >= 0.95) return 5;
  if (score >= 0.8) return 4;
  if (score >= 0.6) return 3;
  if (score >= 0.4) return 2;
  if (score > 0) return 1;
  return 0;
}

export function formatDueLabel(due_at: string): string {
  const due = new Date(due_at);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHr = Math.round(diffMs / 3600000);
  const diffDay = Math.round(diffMs / 86400000);

  if (diffMs < 0) {
    if (diffDay < -1) return `${Math.abs(diffDay)}d overdue`;
    if (diffHr < -1) return `${Math.abs(diffHr)}h overdue`;
    return 'Due now';
  }
  if (diffMin < 60) return `in ${diffMin}m`;
  if (diffHr < 24) return `in ${diffHr}h`;
  return `in ${diffDay}d`;
}

export function formatInterval(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours}h`;
  }
  if (days < 7) return `${Math.round(days * 10) / 10}d`;
  return `${Math.round(days)}d`;
}

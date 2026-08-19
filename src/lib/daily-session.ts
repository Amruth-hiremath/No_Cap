/* ═══════════════════════════════════════════════════════════════════
   Daily Dose — Learning-state-aware planner.
   
   Scoring inputs:
   - due reviews (highest priority)
   - weak concepts (low recall/apply scores)
   - roadmap position (first not-started concept)
   - prerequisite readiness
   - repetition penalty (concept seen yesterday)
   - difficulty preference
   - estimated duration targeting 10-20 min
   
   The session is stable for the same calendar day.
   It changes on the next day based on learning state.
   
   Session composition varies by day type:
   - Day A: recall + new concept + visual + quiz
   - Day B: review + compare + scenario + recall
   - Day C: failure mode + visual + misconception quiz + recall
   - Day D: weak concept review + real system mapping + architecture question + interview prompt
   ═══════════════════════════════════════════════════════════════════ */

import type {
  Concept,
  DailyDoseSession,
  DailyDoseStep,
  MasteryRecord,
  ReviewItem,
  LearningEvent,
} from './types';
import { getAllConcepts, getConcept } from './content';

/** Returns a stable YYYY-MM-DD string in the user's local timezone. */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Day type — rotates through 4 session templates. */
type DayType = 'A' | 'B' | 'C' | 'D';

function getDayType(date: string): DayType {
  const types: DayType[] = ['A', 'B', 'C', 'D'];
  return types[simpleHash(date) % 4];
}

/** Concept seen yesterday — strong repetition penalty. */
function wasStudiedYesterday(slug: string, events: LearningEvent[]): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  return events.some(
    (e) => e.concept_slug === slug && e.created_at.slice(0, 10) === yStr
  );
}

/** Concept seen today — already in the session. */
function wasStudiedToday(slug: string, events: LearningEvent[]): boolean {
  const today = todayLocal();
  return events.some(
    (e) => e.concept_slug === slug && e.created_at.slice(0, 10) === today
  );
}

interface ScoredConcept {
  concept: Concept;
  score: number;
  isReview: boolean;
  isWeak: boolean;
  reason: string;
}

/** Score all concepts based on learning state. Higher = better candidate. */
function scoreConcepts(
  mastery: Record<string, MasteryRecord>,
  reviewItems: Record<string, ReviewItem>,
  events: LearningEvent[]
): ScoredConcept[] {
  const now = new Date();
  const all = getAllConcepts();
  const scored: ScoredConcept[] = [];

  for (const concept of all) {
    const m = mastery[concept.slug];
    const r = reviewItems[concept.slug];
    let score = 0;
    let isReview = false;
    let isWeak = false;
    let reason = '';

    // 1. Due review — highest priority (40 points)
    if (r && new Date(r.due_at) <= now) {
      score += 40;
      isReview = true;
      reason = 'Due for review';
    }

    // 2. Weak concept — low recall or apply score (25 points)
    if (m && (m.recall_score < 0.6 || m.apply_score < 0.5)) {
      score += 25;
      isWeak = true;
      reason = reason || 'Weak recall/apply';
    }

    // 3. Not started — roadmap progression (20 points)
    if (!m || m.state === 'not_started') {
      score += 20;
      reason = reason || 'New concept';
    }

    // 4. Prerequisite readiness bonus (10 points)
    const prereqsMet = concept.prerequisites.every(
      (p) => {
        const pm = mastery[p];
        return pm && (pm.state === 'understood' || pm.state === 'practiced' || pm.state === 'applied' || pm.state === 'mastered');
      }
    );
    if (prereqsMet) {
      score += 10;
    } else {
      score -= 5; // penalty for unmet prerequisites
    }

    // 5. Repetition penalty — studied yesterday (-15 points)
    if (wasStudiedYesterday(concept.slug, events)) {
      score -= 15;
    }

    // 6. Already studied today — skip entirely
    if (wasStudiedToday(concept.slug, events)) {
      score = -100;
    }

    // 7. Difficulty bonus — prefer core concepts for daily dose (5 points)
    if (concept.difficulty === 'core') {
      score += 5;
    }

    scored.push({ concept, score, isReview, isWeak, reason });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/** Build the daily session steps based on day type and concept. */
function buildSteps(
  concept: Concept,
  dayType: DayType,
  isReview: boolean,
  isWeak: boolean
): DailyDoseStep[] {
  const steps: DailyDoseStep[] = [];

  // All days start with warm-up
  if (isReview || isWeak) {
    steps.push({
      id: 'warmup',
      kind: 'recall',
      title: 'Warm-up recall',
      description: isWeak
        ? 'This concept needs work. Pull up what you remember.'
        : 'Review time. What do you recall about this?',
      completed: false,
    });
  }

  // Day-type-specific composition
  switch (dayType) {
    case 'A':
      // New concept + visual + quiz
      steps.push({
        id: 'intro',
        kind: 'concept_intro',
        title: "Today's concept",
        description: concept.summary,
        completed: false,
      });
      addStepForBlock(steps, concept, 'mermaid', 'visual', 'Visual', 'See the concept drawn out.');
      addStepForBlock(steps, concept, 'quiz', 'quiz', 'Quiz', 'One quick question to anchor it.');
      steps.push({
        id: 'recall',
        kind: 'recall',
        title: 'Recall',
        description: 'In your own words: what is this?',
        completed: false,
      });
      break;

    case 'B':
      // Review + compare + scenario + recall
      steps.push({
        id: 'intro',
        kind: 'concept_intro',
        title: 'Review: ' + concept.title,
        description: concept.summary,
        completed: false,
      });
      addStepForBlock(steps, concept, 'scenario', 'prediction', 'Scenario', 'Apply what you know.');
      addStepForBlock(steps, concept, 'quiz', 'quiz', 'Quiz', 'Test your understanding.');
      steps.push({
        id: 'recall',
        kind: 'recall',
        title: 'Active recall',
        description: 'Explain this concept to an imaginary friend.',
        completed: false,
      });
      break;

    case 'C':
      // Failure mode + visual + misconception quiz + recall
      steps.push({
        id: 'intro',
        kind: 'concept_intro',
        title: 'Deep dive: ' + concept.title,
        description: concept.summary,
        completed: false,
      });
      addStepForBlock(steps, concept, 'mermaid', 'visual', 'Architecture', 'How it works visually.');
      addStepForBlock(steps, concept, 'quiz', 'quiz', 'Misconception check', 'What do people get wrong?');
      steps.push({
        id: 'recall',
        kind: 'recall',
        title: 'Recall',
        description: 'What breaks if this component fails?',
        completed: false,
      });
      break;

    case 'D':
      // Weak concept review + real system + architecture + interview
      steps.push({
        id: 'intro',
        kind: 'concept_intro',
        title: 'Strengthen: ' + concept.title,
        description: concept.summary,
        completed: false,
      });
      addStepForBlock(steps, concept, 'mermaid', 'visual', 'Visual', 'Revisit the architecture.');
      addStepForBlock(steps, concept, 'quiz', 'quiz', 'Architecture question', 'Where does this fit?');
      steps.push({
        id: 'recall',
        kind: 'recall',
        title: 'Interview recall',
        description: 'How would you explain this in an interview?',
        completed: false,
      });
      break;
  }

  return steps;
}

/** Add a step if the concept has a block of the given type. */
function addStepForBlock(
  steps: DailyDoseStep[],
  concept: Concept,
  blockType: string,
  stepKind: DailyDoseStep['kind'],
  title: string,
  description: string
) {
  const block = concept.blocks.find((b) => b.type === blockType);
  if (block) {
    steps.push({
      id: stepKind,
      kind: stepKind,
      title,
      description,
      block_ref: block.id,
      completed: false,
    });
  }
}

/** Main entry — builds the daily dose session. */
export function buildDailyDose(
  mastery: Record<string, MasteryRecord>,
  reviewItems: Record<string, ReviewItem>,
  events: LearningEvent[] = []
): DailyDoseSession {
  const date = todayLocal();
  const dayType = getDayType(date);

  // Score all concepts
  const scored = scoreConcepts(mastery, reviewItems, events);

  // Pick the highest-scoring concept (score > 0)
  const pick = scored.find((s) => s.score > 0);
  if (!pick) {
    // Fallback — pick first concept
    const all = getAllConcepts();
    if (all.length === 0) return { date, concept_slug: '', steps: [] };
    return {
      date,
      concept_slug: all[0].slug,
      steps: buildSteps(all[0], dayType, false, false),
    };
  }

  const steps = buildSteps(pick.concept, dayType, pick.isReview, pick.isWeak);

  return {
    date,
    concept_slug: pick.concept.slug,
    review_slug: pick.isReview ? pick.concept.slug : undefined,
    steps,
  };
}

/** Get the reason text for why this concept was selected. */
export function getDailyDoseReason(
  mastery: Record<string, MasteryRecord>,
  reviewItems: Record<string, ReviewItem>,
  events: LearningEvent[] = []
): string {
  const scored = scoreConcepts(mastery, reviewItems, events);
  const pick = scored.find((s) => s.score > 0);
  return pick?.reason || 'Continue your learning journey.';
}

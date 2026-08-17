/* ═══════════════════════════════════════════════════════════════════
   NO CAP Type Definitions
   Mirrors the content schema in /content/*.json
   ═══════════════════════════════════════════════════════════════════ */

/* ── Difficulty & Phase ──────────────────────────────────────────── */

export type Difficulty = 'core' | 'advanced' | 'expert';

export type QuizDifficulty = 'warmup' | 'solid' | 'hard' | 'interview' | 'staff';

/* ── Lesson blocks ──────────────────────────────────────────────── */

export type BlockType =
  | 'prose'
  | 'diagram'
  | 'flow'
  | 'table'
  | 'code'
  | 'quiz'
  | 'simulation'
  | 'scenario'
  | 'callout';

export interface ProseBlock {
  type: 'prose';
  id: string;
  payload: { text: string };
}

export interface DiagramNode {
  id: string;
  label: string;
  kind?: 'default' | 'client' | 'service' | 'datastore' | 'cache' | 'external' | 'decision';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  kind?: 'default' | 'async' | 'sync' | 'failover';
}

export interface DiagramBlock {
  type: 'diagram';
  id: string;
  payload: {
    ascii: string;
    caption?: string;
    alt_text?: string;
    nodes?: DiagramNode[];
    edges?: DiagramEdge[];
    direction?: 'TB' | 'LR';
  };
}

export interface FlowBlock {
  type: 'flow';
  id: string;
  payload: {
    steps: { label: string; detail?: string; tone?: 'default' | 'problem' | 'solution' | 'failure' }[];
    caption?: string;
  };
}

export interface TableBlock {
  type: 'table';
  id: string;
  payload: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
}

export interface CodeBlock {
  type: 'code';
  id: string;
  payload: {
    language: string;
    code: string;
    caption?: string;
  };
}

export interface CalloutBlock {
  type: 'callout';
  id: string;
  payload: {
    title?: string;
    body: string;
    kind?: 'note' | 'success' | 'warning' | 'danger' | 'info';
  };
}

/* ── Quiz architecture ─────────────────────────────────────────── */

export interface QuizOption {
  id: string;
  text: string;
  correct?: boolean;
  explanation?: string;
}

export type QuizShape = 'mcq' | 'multi-select' | 'prediction' | 'scenario' | 'ordering';

export interface QuizBlock {
  type: 'quiz';
  id: string;
  payload: {
    shape?: QuizShape;
    question: string;
    context?: string;
    options: string[] | QuizOption[];
    /** For mcq: index of correct answer in options. */
    answer_index?: number;
    /** For multi-select: indices of correct answers. */
    answer_indices?: number[];
    /** For ordering: the correct order (indices into options). */
    correct_order?: number[];
    rationale: string;
    why_others?: string;
    difficulty?: QuizDifficulty;
    concept_ref?: string;
  };
}

export interface ScenarioOption {
  id: string;
  text: string;
  outcome: string;
  correct?: boolean;
}

export interface ScenarioBlock {
  type: 'scenario';
  id: string;
  payload: {
    prompt: string;
    context?: string;
    options: ScenarioOption[];
    rationale: string;
    difficulty?: QuizDifficulty;
  };
}

export interface SimulationBlock {
  type: 'simulation';
  id: string;
  payload: {
    title: string;
    description: string;
    /** v0.5 ships the interactive engine. v0.1 surfaces the prompt + intended variables. */
    variables?: { name: string; description: string; default?: string }[];
    placeholder_note?: string;
  };
}

export type LessonBlock =
  | ProseBlock
  | DiagramBlock
  | FlowBlock
  | TableBlock
  | CodeBlock
  | CalloutBlock
  | QuizBlock
  | ScenarioBlock
  | SimulationBlock;

/* ── Concept ────────────────────────────────────────────────────── */

export interface Concept {
  slug: string;
  version: number;
  title: string;
  /** One-sentence mental model. */
  summary: string;
  /** Why this concept exists / the problem it solves. */
  why_it_matters?: string;
  phase: string;
  area: string;
  estimated_minutes: number;
  difficulty: Difficulty;
  prerequisites: string[];
  related: string[];
  used_in: string[];
  blocks: LessonBlock[];
  trade_offs: { pros: string[]; cons: string[] };
  failure_modes?: string[];
  common_mistakes: string[];
  where_you_see_it: string[];
  real_system_mappings?: { system: string; how: string }[];
  interview_prompts: string[];
  explain_prompts?: string[];
  cost_metadata?: {
    reference_monthly_cost_usd?: number;
    dominant_cost_driver?: string;
    reference_scale?: string;
  };
  status: 'published' | 'draft';
}

/* ── Track / Phase / Glossary ──────────────────────────────────── */

export interface Phase {
  slug: string;
  title: string;
  description: string;
  concepts: string[];
  order: number;
}

export interface Track {
  slug: string;
  title: string;
  description: string;
  phases: Phase[];
}

export interface GlossaryEntry {
  term: string;
  aliases: string[];
  definition: string;
  concept_slug?: string;
  related?: string[];
  phase?: string;
}

/* ── Mastery (5 dimensions) ─────────────────────────────────────── */

export type MasteryState =
  | 'not_started'
  | 'exposed'
  | 'understood'
  | 'practiced'
  | 'applied'
  | 'review_due'
  | 'mastered';

export interface MasteryRecord {
  concept_slug: string;
  learn_score: number;
  recall_score: number;
  apply_score: number;
  explain_score: number;
  interview_score: number;
  state: MasteryState;
  updated_at: string;
}

export interface ReviewItem {
  concept_slug: string;
  due_at: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  last_quality?: number;
  prior_interval_days?: number;
}

export interface AttemptRecord {
  id: string;
  type: 'quiz' | 'scenario' | 'simulation';
  ref_id: string;
  concept_slug: string;
  score: number;
  response_json: string;
  created_at: string;
}

export interface LearningEvent {
  id: string;
  type:
    | 'concept_started'
    | 'concept_understood'
    | 'quiz_attempt'
    | 'scenario_attempt'
    | 'review_answer'
    | 'focus_session'
    | 'daily_dose_complete';
  concept_slug: string | null;
  payload_json: string;
  created_at: string;
}

/* ── Daily session model ───────────────────────────────────────── */

export interface DailyDoseSession {
  date: string;
  concept_slug: string;
  review_slug?: string;
  steps: DailyDoseStep[];
}

export interface DailyDoseStep {
  id: string;
  kind: 'concept_intro' | 'mental_model' | 'visual' | 'prediction' | 'quiz' | 'recall';
  title: string;
  description: string;
  block_ref?: string;
  completed: boolean;
}

/* ── Focus timer ────────────────────────────────────────────────── */

export type FocusDuration = 5 | 12 | 25;

export interface FocusSessionState {
  duration: FocusDuration;
  remaining: number; // seconds
  running: boolean;
  started_at: string | null;
  concept_slug: string | null;
}

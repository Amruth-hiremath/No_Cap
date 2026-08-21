/* ═══════════════════════════════════════════════════════════════════
   NO CAP Type Definitions
   Mirrors the content schema in /content/*.json
   ═══════════════════════════════════════════════════════════════════ */

/* ── Difficulty & Phase ──────────────────────────────────────────── */

export type AuthProvider = 'google' | 'github';

export type Difficulty = 'core' | 'advanced' | 'expert';

export type QuizDifficulty = 'warmup' | 'solid' | 'hard' | 'interview' | 'staff';

/* ── Lesson blocks ──────────────────────────────────────────────── */

export type BlockType =
  | 'prose'
  | 'flow'
  | 'table'
  | 'code'
  | 'quiz'
  | 'simulation'
  | 'scenario'
  | 'callout'
  | 'mermaid'
  | 'image'
  | 'heading'
  | 'video';

export interface ProseBlock {
  type: 'prose';
  id: string;
  payload: { text: string };
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

export interface MermaidBlock {
  type: 'mermaid';
  id: string;
  payload: {
    code: string;
    caption?: string;
    alt_text?: string;
  };
}

export interface ImageBlock {
  type: 'image';
  id: string;
  payload: {
    src: string;
    alt: string;
    caption?: string;
    credit?: string;
    source_url?: string;
  };
}

export interface HeadingBlock {
  type: 'heading';
  id: string;
  payload: {
    text: string;
    level?: 2 | 3 | 4;
  };
}

export interface VideoBlock {
  type: 'video';
  id: string;
  payload: {
    provider: 'youtube';
    video_id: string;
    title?: string;
    description?: string;
  };
}

export type LessonBlock =
  | ProseBlock
  | FlowBlock
  | TableBlock
  | CodeBlock
  | CalloutBlock
  | QuizBlock
  | ScenarioBlock
  | SimulationBlock
  | MermaidBlock
  | ImageBlock
  | HeadingBlock
  | VideoBlock;

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
  sources?: { title: string; url: string; publisher?: string }[];
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

/* ── Notes / Highlights / Bookmarks ─────────────────────────────── */

export interface Note {
  id: string;
  concept_slug: string;
  block_id?: string;
  title: string;
  body: string;
  selected_text?: string;
  anchor_start?: number;
  anchor_end?: number;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  concept_slug: string;
  block_id: string;
  selected_text: string;
  color: 'amber' | 'green' | 'rust' | 'info';
  created_at: string;
}


export type NoteBlockType =
  | 'text' | 'heading1' | 'heading2' | 'bullet' | 'numbered' | 'checklist'
  | 'quote' | 'callout' | 'code' | 'divider' | 'toggle' | 'table';

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  content: string;
  language?: string;
  checked?: boolean;
  collapsed?: boolean;
  callout_tone?: 'info' | 'tip' | 'warning' | 'important';
  table?: string[][];
}

export interface WorkspaceNote {
  id: string;
  title: string;
  blocks: NoteBlock[];
  canvas_elements: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  concept_slug: string;
  block_id?: string;
  label: string;
  created_at: string;
}

/* ── Curriculum registry ────────────────────────────────────────── */

export interface SectionEntry {
  slug: string;
  title: string;
  status: 'published' | 'draft' | 'planned';
  estimated_minutes: number;
  difficulty: string;
  prerequisites: string[];
  related: string[];
}

export interface CurriculumSection {
  slug: string;
  title: string;
  description: string;
  order: number;
  concepts: SectionEntry[];
}

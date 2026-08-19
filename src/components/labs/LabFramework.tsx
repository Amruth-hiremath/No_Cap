'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  Sparkles,
  Lightbulb,
  Link2,
  PlayCircle,
  FlaskConical,
} from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface GuidedScenario {
  /** Short title for the scenario. */
  title: string;
  /** What the user is being asked to explore. */
  description: ReactNode;
  /** Optional action button that mutates the lab's controls to set the scenario up. */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional follow-up question to provoke thinking after the action runs. */
  question?: ReactNode;
}

export interface RelatedConcept {
  slug: string;
  title: string;
}

export interface LabFrameworkProps {
  /** Eyebrow label, e.g. "Lab 01 · Load Balancer". */
  eyebrow: string;
  /** Lab title, rendered as h1. */
  title: string;
  /** Subtitle shown beneath the title. */
  subtitle?: string;
  /** "What problem are we solving?" content. */
  problem: ReactNode;
  /** Interactive canvas — the live visualization. Rendered in a Surface with extra top padding. */
  canvas: ReactNode;
  /** Controls panel — sliders, toggles, selects. Rendered inside its own Surface. */
  controls: ReactNode;
  /** Live metrics panel — numbers, counters, rates. Rendered inside its own Surface. */
  metrics: ReactNode;
  /** "What just happened?" explanation, derived from the current simulation state. */
  explanation: ReactNode;
  /** "Try this" guided scenario. */
  guidedScenario: GuidedScenario;
  /** "Key takeaway" callout — the durable mental model. */
  takeaway: ReactNode;
  /** Related concept links (rendered at the bottom). */
  relatedConcepts?: RelatedConcept[];
  /** Reset handler — restores defaults and clears counters. */
  onReset: () => void;
  /** Reset button label override. */
  resetLabel?: string;
}

/**
 * LabFramework — shared layout for every interactive lab.
 *
 * Stacks the lab into the canonical sections (problem → canvas →
 * controls + metrics → explanation → guided scenario → takeaway →
 * related concepts) and provides a Reset button at the top right.
 *
 * The lab itself owns the simulation state and passes pre-rendered
 * panels in as children — the framework just composes them.
 */
export function LabFramework({
  eyebrow,
  title,
  subtitle,
  problem,
  canvas,
  controls,
  metrics,
  explanation,
  guidedScenario,
  takeaway,
  relatedConcepts,
  onReset,
  resetLabel = 'Reset lab',
}: LabFrameworkProps) {
  return (
    <div className="space-y-6 pb-4 md:space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/labs"
          className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All labs
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              <FlaskConical className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">{subtitle}</p>
            )}
            <AccentRule className="mt-3" />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onReset}
            className="shrink-0"
            aria-label={resetLabel}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </header>

      {/* What problem are we solving? */}
      <Surface variant="frosted" className="p-4 md:p-5">
        <SectionLabel icon={<HelpCircle className="h-3.5 w-3.5" />}>
          What problem are we solving?
        </SectionLabel>
        <div className="mt-2 text-sm leading-relaxed text-text-secondary">{problem}</div>
      </Surface>

      {/* Canvas — the live visualization */}
      <Surface variant="solid" className="overflow-hidden p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionLabel icon={<PlayCircle className="h-3.5 w-3.5" />}>
            Live simulation
          </SectionLabel>
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-faint">
            updates every 1s
          </span>
        </div>
        {canvas}
      </Surface>

      {/* Controls + metrics — 2-col on desktop, stacked on mobile */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface variant="solid" className="p-4 md:p-5">
          <SectionLabel>Controls</SectionLabel>
          <div className="mt-3 space-y-4">{controls}</div>
        </Surface>
        <Surface variant="solid" className="p-4 md:p-5">
          <SectionLabel>Live metrics</SectionLabel>
          <div className="mt-3">{metrics}</div>
        </Surface>
      </div>

      {/* What just happened? */}
      <Surface variant="frosted" className="p-4 md:p-5">
        <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />}>
          What just happened?
        </SectionLabel>
        <div className="mt-2 text-sm leading-relaxed text-text-secondary">{explanation}</div>
      </Surface>

      {/* Try this — guided scenario */}
      <Surface variant="solid" className="p-4 md:p-5">
        <SectionLabel icon={<Lightbulb className="h-3.5 w-3.5" />}>
          Try this
        </SectionLabel>
        <div className="mt-2">
          <p className="text-sm font-semibold text-text-primary">{guidedScenario.title}</p>
          <div className="mt-1 text-sm leading-relaxed text-text-secondary">
            {guidedScenario.description}
          </div>
          {guidedScenario.action && (
            <Button
              variant="primary"
              size="sm"
              onClick={guidedScenario.action.onClick}
              className="mt-3"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              {guidedScenario.action.label}
            </Button>
          )}
          {guidedScenario.question && (
            <Surface variant="inset" className="mt-3 p-3">
              <p className="text-xs italic leading-relaxed text-text-muted">
                {guidedScenario.question}
              </p>
            </Surface>
          )}
        </div>
      </Surface>

      {/* Key takeaway */}
      <div
        className="rounded-xl border-l-[3px] border-accent bg-accent-soft/40 p-4 md:p-5"
        role="note"
        aria-label="Key takeaway"
      >
        <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />}>
          Key takeaway
        </SectionLabel>
        <div className="mt-2 text-sm leading-relaxed text-text-primary">{takeaway}</div>
      </div>

      {/* Related concepts */}
      {relatedConcepts && relatedConcepts.length > 0 && (
        <Surface variant="inset" className="p-4 md:p-5">
          <SectionLabel icon={<Link2 className="h-3.5 w-3.5" />}>
            Related concepts
          </SectionLabel>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {relatedConcepts.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/concepts/${c.slug}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  <span className="truncate">{c.title}</span>
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      {/* Mobile-only reset button — accessible at the bottom of long pages */}
      <div className="flex justify-center pt-2 sm:hidden">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          {resetLabel}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
      {icon}
      {children}
    </div>
  );
}

/** Small helper for building compact metric rows used inside `metrics` panels. */
export function MetricRow({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  const toneClass: Record<typeof tone, string> = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  };
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="flex flex-col items-end">
        <span className={cn('tnum text-sm font-semibold', toneClass[tone])}>{value}</span>
        {hint && <span className="text-[10px] text-text-faint">{hint}</span>}
      </span>
    </div>
  );
}

/** A labeled slider control. Renders the value to the right of the label. */
export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        <span className="tnum text-xs font-semibold text-text-primary">
          {format ? format(value) : value}
          {unit && <span className="ml-0.5 text-text-muted">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-subtle accent-accent"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      />
      {hint && <p className="mt-1 text-[10px] leading-snug text-text-faint">{hint}</p>}
    </div>
  );
}

/** Segmented control — pick one of N options. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-inset p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              'flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              value === opt.value
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Toggle switch — boolean control. */
export function ToggleControl({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-medium text-text-secondary">{label}</div>
        {hint && <div className="text-[10px] text-text-faint">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-surface-subtle'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

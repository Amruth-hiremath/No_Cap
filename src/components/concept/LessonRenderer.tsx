'use client';

import { Surface } from '@/components/ui/Surface';
import { DiagramRenderer } from './DiagramRenderer';
import { cn } from '@/lib/utils';
import type {
  LessonBlock,
  ProseBlock,
  FlowBlock,
  TableBlock,
  CodeBlock,
  CalloutBlock,
  SimulationBlock,
} from '@/lib/types';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Lightbulb,
  FlaskConical,
  ArrowRight,
  Table as TableIcon,
} from 'lucide-react';

export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'prose':
      return <ProseView block={block} />;
    case 'diagram':
      return <DiagramRenderer block={block} />;
    case 'flow':
      return <FlowView block={block} />;
    case 'table':
      return <TableView block={block} />;
    case 'code':
      return <CodeView block={block} />;
    case 'callout':
      return <CalloutView block={block} />;
    case 'simulation':
      return <SimulationView block={block} />;
    case 'quiz':
    case 'scenario':
      // Quiz and Scenario are rendered as interactive blocks by the
      // owning page (so they can wire into mastery events).
      return null;
    default:
      return null;
  }
}

function ProseView({ block }: { block: ProseBlock }) {
  return (
    <div className="prose-nocap">
      <p>{block.payload.text}</p>
    </div>
  );
}

function FlowView({ block }: { block: FlowBlock }) {
  const toneStyles: Record<string, string> = {
    default: 'border-border-strong bg-surface',
    problem: 'border-warning bg-warning-soft',
    solution: 'border-accent-2 bg-accent-2-soft',
    failure: 'border-danger bg-danger-soft',
  };
  return (
    <ol className="my-5 space-y-2.5">
      {block.payload.steps.map((step, i) => {
        const tone = step.tone ?? 'default';
        return (
          <li key={i} className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold text-text-secondary',
                toneStyles[tone]
              )}
              aria-hidden
            >
              {i + 1}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-[15px] font-medium text-text-primary">{step.label}</div>
              {step.detail && (
                <div className="mt-0.5 text-sm text-text-secondary">{step.detail}</div>
              )}
            </div>
          </li>
        );
      })}
      {block.payload.caption && (
        <p className="mt-3 text-xs text-text-muted">{block.payload.caption}</p>
      )}
    </ol>
  );
}

function TableView({ block }: { block: TableBlock }) {
  const { headers, rows, caption } = block.payload;
  return (
    <figure className="my-5 overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-subtle">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="odd:bg-surface">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-border-faint px-3 py-2 text-text-secondary"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="border-t border-border bg-surface px-3 py-2 text-xs text-text-muted">
          <TableIcon className="mr-1 inline h-3 w-3" />
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function CodeView({ block }: { block: CodeBlock }) {
  return (
    <figure className="my-5 overflow-hidden rounded-lg border border-border">
      <div className="glass-dark px-4 py-3">
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-text-inverse">
          <code>{block.payload.code}</code>
        </pre>
      </div>
      {block.payload.caption && (
        <figcaption className="border-t border-border bg-surface px-4 py-2 text-xs text-text-muted">
          {block.payload.caption}
        </figcaption>
      )}
    </figure>
  );
}

function CalloutView({ block }: { block: CalloutBlock }) {
  const kind = block.payload.kind ?? 'note';
  const config = {
    note: { icon: Info, accent: 'text-info', border: 'border-l-info', bg: 'bg-info-soft' },
    info: { icon: Info, accent: 'text-info', border: 'border-l-info', bg: 'bg-info-soft' },
    success: { icon: CheckCircle2, accent: 'text-success', border: 'border-l-success', bg: 'bg-success-soft' },
    warning: { icon: AlertTriangle, accent: 'text-warning', border: 'border-l-warning', bg: 'bg-warning-soft' },
    danger: { icon: XCircle, accent: 'text-danger', border: 'border-l-danger', bg: 'bg-danger-soft' },
  } as const;
  const cfg = config[kind];
  const Icon = cfg.icon;
  return (
    <Surface
      variant="solid"
      className={cn('!rounded-lg border-l-4 !border-l-info p-4', cfg.border, cfg.bg)}
    >
      <div className={cn('flex items-center gap-2', cfg.accent)}>
        <Icon className="h-4 w-4" aria-hidden />
        {block.payload.title && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            {block.payload.title}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
        {block.payload.body}
      </p>
    </Surface>
  );
}

function SimulationView({ block }: { block: SimulationBlock }) {
  const { title, description, variables, placeholder_note } = block.payload;
  return (
    <Surface variant="inset" className="p-4">
      <div className="flex items-center gap-2 text-text-muted">
        <FlaskConical className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Simulation</span>
        <span className="rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          v0.5
        </span>
      </div>
      <h4 className="mt-2 text-base font-semibold text-text-primary">{title}</h4>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
      {variables && variables.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {variables.map((v) => (
            <li key={v.name} className="flex items-start gap-2 text-sm">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
              <div>
                <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs text-accent">
                  {v.name}
                </code>
                <span className="ml-2 text-text-secondary">{v.description}</span>
                {v.default && (
                  <span className="ml-2 text-xs text-text-muted">default: {v.default}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {placeholder_note && (
        <p className="mt-3 text-xs italic text-text-muted">{placeholder_note}</p>
      )}
    </Surface>
  );
}

/**
 * Lightweight header for a lesson section. Used by the concept page to
 * give lessons a structured-article feel rather than a stack of cards.
 */
export function LessonSectionHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <header className="mt-10 mb-4 border-t border-border pt-6 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{eyebrow}</span>
      </div>
      <h3 className="mt-1 text-lg font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </header>
  );
}

/**
 * A subtle inline highlight used inside prose blocks. Useful when the
 * content wants to call out a key term without going full callout.
 */
export function InlineTerm({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-surface-subtle px-1 py-0.5 text-[0.875em] font-medium text-accent">
      {children}
    </span>
  );
}

/**
 * Lightbulb — small inline tip icon used in lesson sections.
 */
export function TipMarker() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent-soft align-middle text-accent">
      <Lightbulb className="h-2.5 w-2.5" />
    </span>
  );
}

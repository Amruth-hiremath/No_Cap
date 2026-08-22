'use client';

import { useState, useCallback, isValidElement, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Surface } from '@/components/ui/Surface';
const MermaidBlock = dynamic(() => import('./MermaidBlock').then((m) => m.MermaidBlock), { ssr: false, loading: () => <div className="mermaid-loading" aria-label="Loading diagram"><span className="unique-loader unique-loader--sm" /></div> });
import { cn } from '@/lib/utils';
import type {
  LessonBlock,
  ProseBlock,
  FlowBlock,
  TableBlock,
  CodeBlock,
  CalloutBlock,
  SimulationBlock,
  MermaidBlock as MermaidBlockType,
  ImageBlock,
  HeadingBlock,
  VideoBlock,
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
  Copy,
  Check,
} from 'lucide-react';

export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'prose':
      return <ProseView block={block} />;
    case 'mermaid':
      return <MermaidBlock code={block.payload.code} caption={block.payload.caption} alt_text={block.payload.alt_text} />;
    case 'image':
      return <ImageView block={block} />;
    case 'heading':
      return <HeadingView block={block} />;
    case 'video':
      return <VideoView block={block} />;
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Fenced code blocks: react-markdown wraps them in
          // <pre><code class="language-X">…</code></pre>. We intercept the
          // <pre> so we can render our CodeBlockView (with copy button +
          // language label). Inline code falls through to the `code`
          // renderer below.
          pre: ({ children }) => {
            const child = Array.isArray(children) ? children[0] : children;
            if (!isValidElement(child)) {
              return <pre>{children}</pre>;
            }
            const childProps = child.props as { className?: string; children?: ReactNode };
            const match = /language-(\w+)/.exec(childProps.className || '');
            const lang = match ? match[1] : '';
            const codeText = extractText(childProps.children).replace(/\n$/, '');
            return <CodeBlockView language={lang} code={codeText} />;
          },
          // Inline code — keep as a styled <code> element.
          code: ({ className, children, ...props }) => (
            <code className={className} {...props}>
              {children}
            </code>
          ),
          p: ({ children, ...props }) => {
            const plain = extractText(children).trim();
            const stepMatch = plain.match(/^Step\s+(\d+)\s*[—:-]\s*(.*)$/i);
            if (stepMatch) {
              return (
                <div className="reading-step" data-step={stepMatch[1]}>
                  <div className="reading-step__index">{stepMatch[1].padStart(2, '0')}</div>
                  <div className="reading-step__content">{children}</div>
                </div>
              );
            }
            return <p {...props}>{children}</p>;
          },
          // External links open in new tab with rel="noopener".
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          // Wrap tables in a horizontally-scrollable container for mobile.
          table: ({ children }) => (
            <div className="prose-nocap__table-wrap lg:-mx-24 lg:w-[calc(100%+12rem)]">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {block.payload.text}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Recursively extract a plain-text string from a ReactNode tree.
 * Used by the `pre` renderer to get the code text out of the inner
 * `<code>` element (whose children may be strings, arrays, or nested
 * React elements produced by react-markdown).
 */
function extractText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return '';
}

/**
 * CodeBlockView — rendered by react-markdown for fenced code blocks.
 * Shows language label and a copy-to-clipboard button.
 */
function CodeBlockView({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  return (
    <figure className="prose-nocap__code-block my-5 overflow-hidden rounded-lg border border-border lg:-mx-24 lg:w-[calc(100%+12rem)]">
      <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-3 py-1.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <div className="glass-dark min-w-0">
        <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-text-inverse">
          <code>{code}</code>
        </pre>
      </div>
    </figure>
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
    <figure className="nocap-breakout my-5 overflow-hidden rounded-lg border border-border lg:-mx-24 lg:w-[calc(100%+12rem)]">
      <div className="overflow-x-auto min-w-0">
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
    <figure className="nocap-breakout my-5 overflow-hidden rounded-lg border border-border lg:-mx-24 lg:w-[calc(100%+12rem)]">
      <div className="glass-dark min-w-0 px-4 py-3">
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
  const config: Record<string, { icon: typeof Info; accent: string; border: string; bg: string }> = {
    note: { icon: Info, accent: 'text-info', border: 'border-l-info', bg: 'bg-info-soft' },
    info: { icon: Info, accent: 'text-info', border: 'border-l-info', bg: 'bg-info-soft' },
    success: { icon: CheckCircle2, accent: 'text-success', border: 'border-l-success', bg: 'bg-success-soft' },
    warning: { icon: AlertTriangle, accent: 'text-warning', border: 'border-l-warning', bg: 'bg-warning-soft' },
    danger: { icon: XCircle, accent: 'text-danger', border: 'border-l-danger', bg: 'bg-danger-soft' },
    tip: { icon: Lightbulb, accent: 'text-accent', border: 'border-l-accent', bg: 'bg-accent-soft' },
  };
  const cfg = config[kind] ?? config.note;
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
      <div className="prose-nocap mt-1.5 text-sm leading-relaxed text-text-secondary [&_p]:mb-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.payload.body}</ReactMarkdown>
      </div>
    </Surface>
  );
}

function SimulationView({ block }: { block: SimulationBlock }) {
  const { title, description, variables } = block.payload;
  const initial = Object.fromEntries((variables ?? []).map((v) => [v.name, parseNumeric(v.default) ?? 1]));
  const [values, setValues] = useState<Record<string, number>>(initial);

  const get = (name: string, fallback = 1) => values[name] ?? fallback;
  const traffic = get('traffic', get('request_rate', get('producer_rate', 1000)));
  const latency = get('latency', 50);
  const failure = get('failure_rate', 0);
  const hitRate = get('hit_rate', 0.9);
  const producers = get('producer_rate', traffic);
  const consumers = get('consumer_count', 4);
  const processing = get('processing_rate', 250);
  const replicas = get('replicas', 3);
  const readRatio = get('read_ratio', 0.8);
  const lag = get('lag', 50);

  const originLoad = Math.max(0, traffic * (1 - (hitRate > 1 ? hitRate / 100 : hitRate)));
  const backlogRate = Math.max(0, producers - consumers * processing);
  const staleRisk = Math.min(100, Math.max(0, lag * 1.2 * readRatio));
  const pressure = Math.min(100, Math.round(Math.min(1, (traffic / 10000) * 0.45 + (latency / 1000) * 0.25 + (failure / 100) * 0.30) * 100));

  function bounds(name: string): [number, number, number] {
    const n = name.toLowerCase();
    if (n.includes('failure')) return [0, 20, 1];
    if (n.includes('hit_rate') || n.includes('read_ratio')) return [0, 1, 0.01];
    if (n.includes('latency') || n.includes('lag')) return [1, 5000, 1];
    if (n.includes('replicas') || n.includes('instances') || n.includes('consumer_count')) return [1, 32, 1];
    if (n.includes('processing_rate')) return [1, 5000, 25];
    if (n.includes('rate') || n.includes('traffic') || n.includes('producer')) return [1, 10000, 10];
    return [0, 10000, 1];
  }

  return (
    <Surface variant="inset" className="my-5 overflow-hidden p-0">
      <div className="border-b border-border bg-surface-subtle/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-text-muted">
          <FlaskConical className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Interactive sandbox</span>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium">deterministic</span>
        </div>
        <h4 className="mt-1.5 text-base font-semibold text-text-primary">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-4">
          {(variables ?? []).map((v) => {
            const current = get(v.name, parseNumeric(v.default) ?? 1);
            const [min, max, step] = bounds(v.name);
            const safeCurrent = Math.max(min, Math.min(max, Number.isFinite(current) ? current : min));
            const display = v.name.includes('rate') || v.name.includes('traffic') || v.name.includes('count') || v.name === 'replicas' || v.name === 'instances'
              ? Math.round(safeCurrent).toLocaleString()
              : safeCurrent.toFixed(v.name.includes('ratio') || v.name.includes('hit_rate') ? 2 : 0);
            return (
              <label key={v.name} className="block rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-text-primary">{v.name}</span>
                  <span className="tnum rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-semibold text-accent">{Number.isFinite(safeCurrent) ? display : '—'}{v.name.includes('latency') || v.name.includes('lag') ? ' ms' : v.name.includes('failure') || v.name.includes('rate_pct') ? '%' : ''}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={safeCurrent}
                  onChange={(e) => { const next = Number(e.target.value); setValues((prev) => ({ ...prev, [v.name]: Number.isFinite(next) ? Math.max(min, Math.min(max, next)) : min })); }}
                  className="w-full accent-[var(--color-accent)]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-text-faint"><span>{min}</span><span>{max}</span></div>
                <p className="mt-2 text-xs text-text-muted">{v.description}</p>
              </label>
            );
          })}
        </div>

        <div className="space-y-3">
          <Metric label="System pressure" value={`${pressure}%`} progress={pressure} tone={pressure > 75 ? 'warning' : 'accent'} />
          {('hit_rate' in values || variables?.some(v => v.name === 'hit_rate')) && <Metric label="Approx. origin requests" value={`${Math.round(originLoad).toLocaleString()}/s`} progress={Math.min(100, originLoad / Math.max(1, traffic) * 100)} tone="info" />}
          {variables?.some(v => v.name === 'producer_rate') && <Metric label="Queue backlog growth" value={backlogRate > 0 ? `+${Math.round(backlogRate).toLocaleString()}/s` : 'stable'} progress={Math.min(100, backlogRate / Math.max(1, producers) * 100)} tone={backlogRate > 0 ? 'warning' : 'success'} />}
          {variables?.some(v => v.name === 'replicas') && <Metric label="Replica fault tolerance" value={`${Math.max(0, replicas - 1)} failure(s)`} progress={Math.min(100, replicas * 20)} tone="success" />}
          {variables?.some(v => v.name === 'lag') && <Metric label="Stale-read pressure" value={`${Math.round(staleRisk)}%`} progress={staleRisk} tone={staleRisk > 60 ? 'warning' : 'info'} />}

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent"><Lightbulb className="h-3.5 w-3.5" /> Try this</div>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">Change one variable at a time. Predict the failure mode first, then move the slider and see whether your mental model matches the simplified system response.</p>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function parseNumeric(value?: string) {
  if (!value) return null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function Metric({ label, value, progress, tone }: { label: string; value: string; progress: number; tone: 'accent'|'warning'|'info'|'success' }) {
  const bar = tone === 'warning' ? 'bg-warning' : tone === 'success' ? 'bg-success' : tone === 'info' ? 'bg-info' : 'bg-accent';
  return <div className="rounded-lg border border-border bg-surface p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs text-text-muted">{label}</span><span className="tnum text-sm font-semibold text-text-primary">{value}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className={`h-full rounded-full transition-all duration-300 ${bar}`} style={{width:`${Math.max(0,Math.min(100,progress))}%`}} /></div></div>;
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

/* ── New block renderers ────────────────────────────────────────── */

function ImageView({ block }: { block: ImageBlock }) {
  return (
    <figure className="my-5">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <img
          src={block.payload.src}
          alt={block.payload.alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="w-full"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const fallback = (e.currentTarget.nextElementSibling as HTMLElement);
            if (fallback) fallback.style.display = 'block';
          }}
        />
        <div style={{ display: 'none' }} className="p-8 text-center text-sm text-text-muted">
          Image unavailable. {block.payload.alt}
        </div>
      </div>
      {(block.payload.caption || block.payload.credit) && (
        <figcaption className="mt-2 text-center text-xs text-text-muted">
          {block.payload.caption}
          {block.payload.credit && (
            <span className="ml-1 text-text-faint">— {block.payload.credit}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function HeadingView({ block }: { block: HeadingBlock }) {
  const level = block.payload.level ?? 2;
  const Tag = (`h${level}` as 'h2' | 'h3' | 'h4');
  const sizes = {
    h2: 'text-xl font-semibold mt-8 mb-3 text-text-primary',
    h3: 'text-lg font-semibold mt-6 mb-2 text-text-primary',
    h4: 'text-base font-semibold mt-4 mb-2 text-text-primary',
  };
  return <Tag className={sizes[Tag]}>{block.payload.text}</Tag>;
}

function VideoView({ block }: { block: VideoBlock }) {
  const { video_id, title, description } = block.payload;
  return (
    <figure className="my-5">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${video_id}`}
            title={title || 'Embedded video'}
            className="absolute inset-0 h-full w-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
      {(title || description) && (
        <figcaption className="mt-2 text-xs text-text-muted">
          {title && <span className="font-medium text-text-secondary">{title}</span>}
          {description && <span className="ml-1">— {description}</span>}
        </figcaption>
      )}
    </figure>
  );
}

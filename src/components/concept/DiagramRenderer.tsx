'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DiagramBlock, DiagramNode, DiagramEdge } from '@/lib/types';

interface DiagramRendererProps {
  block: DiagramBlock;
}

const KIND_COLORS: Record<NonNullable<DiagramNode['kind']>, { fill: string; stroke: string; text: string }> = {
  default: { fill: 'var(--color-surface-elevated)', stroke: 'var(--color-border-strong)', text: 'var(--color-text-primary)' },
  client: { fill: 'var(--color-accent-soft)', stroke: 'var(--color-accent)', text: 'var(--color-accent)' },
  service: { fill: 'var(--color-surface-elevated)', stroke: 'var(--color-border-strong)', text: 'var(--color-text-primary)' },
  datastore: { fill: 'var(--color-info-soft)', stroke: 'var(--color-info)', text: 'var(--color-info)' },
  cache: { fill: 'var(--color-accent-2-soft)', stroke: 'var(--color-accent-2)', text: 'var(--color-accent-2)' },
  external: { fill: 'var(--color-surface-subtle)', stroke: 'var(--color-border-strong)', text: 'var(--color-text-secondary)' },
  decision: { fill: 'var(--color-warning-soft)', stroke: 'var(--color-warning)', text: 'var(--color-warning)' },
};

const NODE_W = 130;
const NODE_H = 50;
const GAP_Y = 90;
const MARGIN_X = 40;
const MARGIN_Y = 30;

/**
 * DiagramRenderer — renders semantic node/edge graphs as SVG.
 * Falls back to ASCII text view on demand (accessibility / copy).
 * Layout: vertical stack with simple auto-positioning.
 */
export function DiagramRenderer({ block }: DiagramRendererProps) {
  const { ascii, caption, alt_text, nodes, edges, direction = 'TB' } = block.payload;
  const [showText, setShowText] = useState(false);

  const layout = useMemo(() => {
    if (!nodes || nodes.length === 0) return null;
    const isLR = direction === 'LR';
    const items = nodes.map((n, i) => ({
      ...n,
      x: isLR ? MARGIN_X + i * (NODE_W + 60) : MARGIN_X,
      y: isLR ? MARGIN_Y : MARGIN_Y + i * GAP_Y,
    }));
    const width = isLR
      ? MARGIN_X + nodes.length * (NODE_W + 60)
      : MARGIN_X * 2 + NODE_W;
    const height = isLR
      ? MARGIN_Y * 2 + NODE_H
      : MARGIN_Y * 2 + nodes.length * GAP_Y;
    return { items, width, height, isLR };
  }, [nodes, direction]);

  return (
    <figure className="my-5 overflow-hidden rounded-lg border border-border bg-surface">
      {layout && !showText ? (
        <div className="relative overflow-x-auto bg-surface-inset">
          <svg
            width={layout.width}
            height={layout.height}
            className="block min-w-full"
            role="img"
            aria-label={alt_text ?? caption ?? 'Concept diagram'}
          >
            {/* Edges */}
            {edges?.map((edge, i) => {
              const from = layout.items.find((n) => n.id === edge.from);
              const to = layout.items.find((n) => n.id === edge.to);
              if (!from || !to) return null;

              const fromX = from.x + NODE_W / 2;
              const fromY = from.y + NODE_H;
              const toX = to.x + NODE_W / 2;
              const toY = to.y;
              const midY = (fromY + toY) / 2;

              const isAsync = edge.kind === 'async';
              const stroke = isAsync ? 'var(--color-accent-3)' : 'var(--color-border-strong)';

              return (
                <g key={i}>
                  <path
                    d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY - 6}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray={isAsync ? '4 3' : undefined}
                  />
                  <polygon
                    points={`${toX - 4},${toY - 6} ${toX + 4},${toY - 6} ${toX},${toY}`}
                    fill={stroke}
                  />
                  {edge.label && (
                    <text
                      x={(fromX + toX) / 2}
                      y={midY - 4}
                      textAnchor="middle"
                      className="font-mono fill-[var(--color-text-muted)]"
                      fontSize="10"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {layout.items.map((n) => {
              const kind = n.kind ?? 'default';
              const colors = KIND_COLORS[kind];
              const isDecision = kind === 'decision';
              return (
                <g key={n.id}>
                  {isDecision ? (
                    <polygon
                      points={`${n.x + NODE_W / 2},${n.y} ${n.x + NODE_W},${n.y + NODE_H / 2} ${n.x + NODE_W / 2},${n.y + NODE_H} ${n.x},${n.y + NODE_H / 2}`}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <rect
                      x={n.x}
                      y={n.y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={6}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={1.5}
                    />
                  )}
                  <text
                    x={n.x + NODE_W / 2}
                    y={n.y + NODE_H / 2 + 4}
                    textAnchor="middle"
                    className="font-medium"
                    fontSize="12"
                    fill={colors.text}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <pre className="overflow-x-auto bg-surface-inset p-4 font-mono text-xs leading-relaxed text-text-secondary">
          {ascii}
        </pre>
      )}

      <figcaption className="flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-2.5">
        {caption ? (
          <p className="text-xs text-text-muted">{caption}</p>
        ) : (
          <span className="text-xs text-text-faint">Diagram</span>
        )}
        <div className="flex items-center gap-2">
          {nodes && nodes.length > 0 && (
            <button
              onClick={() => setShowText(!showText)}
              className="rounded border border-border px-2 py-0.5 text-[11px] text-text-muted hover:bg-surface-subtle"
              aria-label="Toggle text view"
            >
              {showText ? 'Diagram view' : 'Text view'}
            </button>
          )}
        </div>
      </figcaption>

      {alt_text && (
        <details className="border-t border-border bg-surface px-4 py-2 text-xs text-text-muted">
          <summary className="cursor-pointer select-none">Screen reader description</summary>
          <p className="mt-2 leading-relaxed">{alt_text}</p>
        </details>
      )}
    </figure>
  );
}

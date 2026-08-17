'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Concept, MasteryState } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GraphNode {
  slug: string;
  label: string;
  area: string;
  x: number;
  y: number;
  state: MasteryState;
}

interface GraphEdge {
  from: string;
  to: string;
  kind: 'prerequisite' | 'related';
}

interface RoadmapGraphProps {
  concepts: Concept[];
  states: Record<string, MasteryState>;
}

const NODE_W = 130;
const NODE_H = 44;
const COL_GAP = 180;
const ROW_GAP = 80;
const PADDING = 40;

/**
 * RoadmapGraph — lightweight SVG dependency graph.
 * Layouts concepts in columns by phase order, ordered by phase within.
 */
export function RoadmapGraph({ concepts, states }: RoadmapGraphProps) {
  const { nodes, edges, width, height } = useMemo(() => {
    // Group by phase (preserve concept order in each phase)
    const phases = new Map<string, Concept[]>();
    for (const c of concepts) {
      if (!phases.has(c.phase)) phases.set(c.phase, []);
      phases.get(c.phase)!.push(c);
    }
    const phaseList = Array.from(phases.keys());

    const nodes: GraphNode[] = [];
    phaseList.forEach((phase, colIdx) => {
      const phaseConcepts = phases.get(phase)!;
      phaseConcepts.forEach((c, rowIdx) => {
        nodes.push({
          slug: c.slug,
          label: c.title,
          area: c.area,
          x: PADDING + colIdx * COL_GAP,
          y: PADDING + rowIdx * ROW_GAP,
          state: states[c.slug] ?? 'not_started',
        });
      });
    });

    const edges: GraphEdge[] = [];
    for (const c of concepts) {
      for (const p of c.prerequisites) {
        if (concepts.find((x) => x.slug === p)) {
          edges.push({ from: p, to: c.slug, kind: 'prerequisite' });
        }
      }
      for (const r of c.related) {
        if (
          concepts.find((x) => x.slug === r) &&
          !edges.some((e) => (e.from === r && e.to === c.slug) || (e.from === c.slug && e.to === r))
        ) {
          edges.push({ from: c.slug, to: r, kind: 'related' });
        }
      }
    }

    const width = PADDING * 2 + phaseList.length * COL_GAP;
    const height = PADDING * 2 + Math.max(...Array.from(phases.values()).map((p) => p.length)) * ROW_GAP;
    return { nodes, edges, width, height };
  }, [concepts, states]);

  const stateColor: Record<MasteryState, string> = {
    not_started: 'var(--color-border)',
    exposed: 'var(--color-accent)',
    understood: 'var(--color-accent)',
    practiced: 'var(--color-accent)',
    applied: 'var(--color-success)',
    review_due: 'var(--color-warning)',
    mastered: 'var(--color-success)',
  };

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    nodes.forEach((n) => m.set(n.slug, n));
    return m;
  }, [nodes]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
      <svg
        width={Math.max(width, 600)}
        height={height}
        className="block min-w-full"
        role="img"
        aria-label="Roadmap dependency graph"
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeById.get(e.from);
          const to = nodeById.get(e.to);
          if (!from || !to) return null;
          const isPrereq = e.kind === 'prerequisite';
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          const midX = (x1 + x2) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - 6} ${y2}`}
                stroke={isPrereq ? 'var(--color-border-strong)' : 'var(--color-border)'}
                strokeWidth={isPrereq ? 1.5 : 1}
                strokeDasharray={isPrereq ? undefined : '3 3'}
                fill="none"
              />
              <polygon
                points={`${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4} ${x2},${y2}`}
                fill={isPrereq ? 'var(--color-border-strong)' : 'var(--color-border)'}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const color = stateColor[n.state];
          const isActive = n.state !== 'not_started';
          return (
            <Link key={n.slug} href={`/concepts/${n.slug}`}>
              <g
                className="cursor-pointer"
                role="link"
                aria-label={`${n.label} — ${n.state}`}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={isActive ? 'var(--color-surface-elevated)' : 'var(--color-surface-subtle)'}
                  stroke={color}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <circle
                  cx={n.x + 8}
                  cy={n.y + NODE_H / 2}
                  r={3}
                  fill={color}
                />
                <text
                  x={n.x + 18}
                  y={n.y + NODE_H / 2 + 4}
                  fontSize="11"
                  fontWeight="500"
                  fill="var(--color-text-primary)"
                  className="pointer-events-none"
                >
                  {n.label.length > 18 ? n.label.slice(0, 16) + '…' : n.label}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}

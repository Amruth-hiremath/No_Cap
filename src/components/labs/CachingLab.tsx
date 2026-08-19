'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Database,
  Zap,
  HardDrive,
  Server,
  Clock,
  TrendingDown,
} from 'lucide-react';
import {
  LabFramework,
  MetricRow,
  SliderControl,
  ToggleControl,
  type GuidedScenario,
  type RelatedConcept,
} from './LabFramework';
import { cn } from '@/lib/utils';

const CACHED_LATENCY_MS = 5;
const DB_LATENCY_MS = 50;
const TICK_MS = 1000;

const DEFAULTS = {
  requestRate: 200,
  hitRate: 80,
  ttl: 60,
  cacheAvailable: true,
};

interface FlowDot {
  id: number;
  kind: 'hit' | 'miss';
}

export function CachingLab() {
  const [requestRate, setRequestRate] = useState(DEFAULTS.requestRate);
  const [hitRate, setHitRate] = useState(DEFAULTS.hitRate);
  const [ttl, setTtl] = useState(DEFAULTS.ttl);
  const [cacheAvailable, setCacheAvailable] = useState(DEFAULTS.cacheAvailable);

  const [cacheHits, setCacheHits] = useState(0);
  const [cacheMisses, setCacheMisses] = useState(0);
  const [dbRequests, setDbRequests] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [tickHits, setTickHits] = useState(0);
  const [tickMisses, setTickMisses] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flowDots, setFlowDots] = useState<FlowDot[]>([]);

  // Compute effective hit rate (0 if cache is off).
  const effectiveHitRate = cacheAvailable ? hitRate / 100 : 0;

  const tickRef = useRef({ cacheHits, cacheMisses, dbRequests });
  useEffect(() => {
    tickRef.current = { cacheHits, cacheMisses, dbRequests };
  }, [cacheHits, cacheMisses, dbRequests]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const hits = Math.round(requestRate * effectiveHitRate);
      const misses = requestRate - hits;
      const dbReqs = cacheAvailable ? misses : requestRate;

      setCacheHits((prev) => prev + hits);
      setCacheMisses((prev) => prev + misses);
      setDbRequests((prev) => prev + dbReqs);
      setTickHits(hits);
      setTickMisses(misses);

      const totalLat = hits * CACHED_LATENCY_MS + dbReqs * DB_LATENCY_MS;
      const avg = requestRate > 0 ? totalLat / requestRate : 0;
      setAvgLatency(avg);

      // Spawn flow dots for visualization (cap at 6 visible per tick)
      const dotCount = Math.min(6, Math.max(2, Math.ceil(requestRate / 80)));
      const newDots: FlowDot[] = Array.from({ length: dotCount }, (_, i) => ({
        id: Date.now() + i,
        kind: cacheAvailable && i / dotCount < effectiveHitRate ? 'hit' : 'miss',
      }));
      setFlowDots(newDots);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [requestRate, effectiveHitRate, cacheAvailable, paused]);

  const staleRisk = Math.min(100, Math.round((ttl / 300) * 100));
  const effectiveHitPct = Math.round(effectiveHitRate * 100);
  const dbLoad = cacheAvailable ? requestRate * (1 - effectiveHitRate) : requestRate;

  function handleReset() {
    setRequestRate(DEFAULTS.requestRate);
    setHitRate(DEFAULTS.hitRate);
    setTtl(DEFAULTS.ttl);
    setCacheAvailable(DEFAULTS.cacheAvailable);
    setCacheHits(0);
    setCacheMisses(0);
    setDbRequests(0);
    setAvgLatency(0);
    setTickHits(0);
    setTickMisses(0);
    setFlowDots([]);
    setPaused(false);
  }

  const explanation = useMemo(() => {
    if (!cacheAvailable) {
      return (
        <>
          Cache is <strong className="text-danger">disabled</strong>. Every single request falls
          through to the database — {requestRate} req/s hitting DB at {DB_LATENCY_MS}ms each.
          That&apos;s the worst-case scenario caches exist to prevent.
        </>
      );
    }
    if (effectiveHitRate < 0.3) {
      return (
        <>
          Hit rate is only {effectiveHitPct}%. The cache is barely helping — most requests still
          reach the DB. Either the working set doesn&apos;t fit, the TTL is too short, or the cache
          keys are wrong.
        </>
      );
    }
    if (effectiveHitRate >= 0.8) {
      return (
        <>
          {effectiveHitPct}% of requests are served from cache at {CACHED_LATENCY_MS}ms each. Only{' '}
          {Math.round(requestRate * (1 - effectiveHitRate))} req/s reach the DB. This is the
          payoff: cache absorbs the majority of load.
        </>
      );
    }
    return (
      <>
        {effectiveHitPct}% of requests hit the cache ({CACHED_LATENCY_MS}ms); the rest miss and fall
        through to the DB ({DB_LATENCY_MS}ms). Avg latency is dominated by the miss path.
      </>
    );
  }, [cacheAvailable, effectiveHitRate, effectiveHitPct, requestRate]);

  const guidedScenario: GuidedScenario = {
    title: 'Turn the cache off',
    description:
      'Your cache cluster just went down. Toggle the cache off and watch what happens to DB load and average latency. Then bring it back up.',
    action: {
      label: 'Toggle cache',
      onClick: () => setCacheAvailable((v) => !v),
    },
    question:
      'If your DB can handle 500 req/s and traffic is 1000 req/s with an 80% hit rate, what happens to the DB when the cache fails? Where does the request go?',
  };

  const relatedConcepts: RelatedConcept[] = [
    { slug: 'caching-strategies', title: 'Caching Strategies' },
    { slug: 'cache-aside', title: 'Cache-Aside' },
    { slug: 'write-through', title: 'Write-Through' },
    { slug: 'cdn-caching', title: 'CDN Caching' },
  ];

  return (
    <LabFramework
      eyebrow="Lab 02 · Caching"
      title="Absorb reads before they hit the database"
      subtitle="Slide the hit rate. Crank the TTL. Watch the database breathe — or panic."
      problem={
        <>
          A database query at 50ms is fine — until you multiply it by 1,000 requests per second.
          That&apos;s 50 seconds of DB work every wall-clock second, and your users see it as
          latency. A <strong>cache</strong> sits in front of the slow thing and answers the
          questions it&apos;s already answered. The tradeoff: every cached answer is potentially{' '}
          <em>stale</em>, and a cache miss is more expensive than no cache at all.
        </>
      }
      canvas={
        <div className="space-y-4">
          {/* Pipeline */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <PipelineNode icon={<Server className="h-3.5 w-3.5" />} label="App" tone="default" />
            <FlowLane dots={flowDots} cacheAvailable={cacheAvailable} />
            {cacheAvailable ? (
              <>
                <PipelineNode
                  icon={<HardDrive className="h-3.5 w-3.5" />}
                  label="Cache"
                  tone="accent"
                  badge={`${effectiveHitPct}%`}
                />
                <PipelineNode
                  icon={<Database className="h-3.5 w-3.5" />}
                  label="DB"
                  tone="default"
                  badge={`${Math.round(dbLoad)}/s`}
                />
              </>
            ) : (
              <PipelineNode
                icon={<Database className="h-3.5 w-3.5" />}
                label="DB"
                tone="danger"
                badge={`${requestRate}/s`}
              />
            )}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2">
            <StatChip
              icon={<Zap className="h-3 w-3" />}
              label="Hits this tick"
              value={`${tickHits}`}
              tone="success"
            />
            <StatChip
              icon={<TrendingDown className="h-3 w-3" />}
              label="Misses this tick"
              value={`${tickMisses}`}
              tone="warning"
            />
            <StatChip
              icon={<Database className="h-3 w-3" />}
              label="DB reqs this tick"
              value={`${cacheAvailable ? tickMisses : requestRate}`}
              tone="danger"
            />
          </div>

          <p className="text-[10px] text-text-faint">
            Cache hit ≈ {CACHED_LATENCY_MS}ms · DB read ≈ {DB_LATENCY_MS}ms.
          </p>
        </div>
      }
      controls={
        <>
          <SliderControl
            label="Request rate"
            value={requestRate}
            min={1}
            max={1000}
            unit=" req/s"
            onChange={setRequestRate}
          />
          <SliderControl
            label="Cache hit rate"
            value={hitRate}
            min={0}
            max={100}
            unit="%"
            disabled={!cacheAvailable}
            onChange={setHitRate}
          />
          <SliderControl
            label="TTL (time-to-live)"
            value={ttl}
            min={1}
            max={300}
            unit="s"
            disabled={!cacheAvailable}
            onChange={setTtl}
          />
          <ToggleControl
            label="Cache available"
            checked={cacheAvailable}
            onChange={setCacheAvailable}
            hint={cacheAvailable ? 'Serving reads from cache' : 'Bypassed — all reads go to DB'}
          />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            {paused ? 'Resume simulation' : 'Pause simulation'}
          </button>
        </>
      }
      metrics={
        <>
          <MetricRow
            label="Cache hits"
            value={cacheHits.toLocaleString()}
            hint={`${tickHits} this tick`}
            tone="success"
          />
          <MetricRow
            label="Cache misses"
            value={cacheMisses.toLocaleString()}
            hint={`${tickMisses} this tick`}
            tone="warning"
          />
          <MetricRow
            label="DB requests"
            value={dbRequests.toLocaleString()}
            tone={cacheAvailable ? 'default' : 'danger'}
          />
          <MetricRow
            label="Avg latency"
            value={`${avgLatency.toFixed(1)} ms`}
            tone={avgLatency > 30 ? 'danger' : avgLatency > 10 ? 'warning' : 'success'}
          />
          <MetricRow
            label="Stale-data risk"
            value={`${staleRisk}%`}
            hint={`TTL ${ttl}s`}
            tone={staleRisk > 60 ? 'warning' : 'default'}
          />
          <div className="mt-3 rounded-md border border-border bg-surface-inset p-2.5 text-xs text-text-muted">
            <div className="mb-1 flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Worked example
            </div>
            <p className="leading-relaxed">
              At <strong className="text-text-secondary">{requestRate} req/s</strong> with{' '}
              <strong className="text-text-secondary">{effectiveHitPct}% hit</strong>: DB sees{' '}
              <strong className="text-text-secondary">{Math.round(dbLoad)} req/s</strong>.
              Without the cache, DB would see all{' '}
              <strong className="text-text-secondary">{requestRate} req/s</strong>.
            </p>
          </div>
        </>
      }
      explanation={explanation}
      guidedScenario={guidedScenario}
      takeaway={
        <>
          A cache trades <strong>consistency for capacity</strong>. Every hit is a DB query you
          didn&apos;t have to run — but every entry has a TTL, and after the TTL you may serve
          stale data. The three dials — <em>hit rate</em>, <em>TTL</em>, and <em>cache
          availability</em> — together determine whether your cache is a force multiplier or a
          liability.
        </>
      }
      relatedConcepts={relatedConcepts}
      onReset={handleReset}
    />
  );
}

function PipelineNode({
  icon,
  label,
  tone,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'default' | 'accent' | 'danger';
  badge?: string;
}) {
  const toneBorder =
    tone === 'accent'
      ? 'border-accent/40 bg-accent-soft/40'
      : tone === 'danger'
        ? 'border-danger/60 bg-danger-soft/40'
        : 'border-border bg-surface-inset';
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center gap-1 rounded-md border px-3 py-2 text-center',
        toneBorder
      )}
    >
      <div className="text-text-secondary">{icon}</div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
        {label}
      </span>
      {badge && <span className="tnum text-[10px] text-text-muted">{badge}</span>}
    </div>
  );
}

function FlowLane({
  dots,
  cacheAvailable,
}: {
  dots: FlowDot[];
  cacheAvailable: boolean;
}) {
  return (
    <div className="relative h-10 min-w-[80px] flex-1 overflow-hidden" aria-hidden>
      {/* Connection line */}
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      {/* Dots */}
      {dots.map((d, i) => (
        <span
          key={d.id}
          className={cn(
            'lab-dot-flow absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full',
            d.kind === 'hit' || !cacheAvailable ? 'bg-success' : 'bg-warning'
          )}
          style={
            {
              left: `${(i / dots.length) * 60}%`,
              '--lab-flow-distance': '80px',
              '--lab-flow-duration': '1000ms',
              animationDelay: `${(i / dots.length) * 1000}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success bg-success-soft/60'
      : tone === 'warning'
        ? 'text-warning bg-warning-soft/60'
        : 'text-danger bg-danger-soft/60';
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-2">
      <div className={cn('flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium', toneClass)}>
        {icon}
        {label}
      </div>
      <span className="tnum text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

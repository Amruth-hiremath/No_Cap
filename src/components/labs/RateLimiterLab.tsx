'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  Droplet,
  Gauge,
  Timer,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import {
  LabFramework,
  MetricRow,
  SliderControl,
  SegmentedControl,
  type GuidedScenario,
  type RelatedConcept,
} from './LabFramework';
import { cn } from '@/lib/utils';

type Algorithm = 'token-bucket' | 'leaky-bucket' | 'fixed-window';

const TICK_MS = 1000;

const DEFAULTS = {
  requestRate: 30,
  limit: 20,
  burstSize: 10,
  algorithm: 'token-bucket' as Algorithm,
};

interface FlowDot {
  id: number;
  allowed: boolean;
}

export function RateLimiterLab() {
  const [requestRate, setRequestRate] = useState(DEFAULTS.requestRate);
  const [limit, setLimit] = useState(DEFAULTS.limit);
  const [burstSize, setBurstSize] = useState(DEFAULTS.burstSize);
  const [algorithm, setAlgorithm] = useState<Algorithm>(DEFAULTS.algorithm);

  const [totalAllowed, setTotalAllowed] = useState(0);
  const [totalRejected, setTotalRejected] = useState(0);
  const [allowedThisTick, setAllowedThisTick] = useState(0);
  const [rejectedThisTick, setRejectedThisTick] = useState(0);

  // Algorithm-internal state
  const [tokenCount, setTokenCount] = useState(0);
  const [queueDepth, setQueueDepth] = useState(0);
  const [windowCount, setWindowCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flowDots, setFlowDots] = useState<FlowDot[]>([]);

  const tokenRef = useRef(0);
  const queueRef = useRef(0);
  const windowRef = useRef(0);

  // When algorithm changes, reset internal state.
  useEffect(() => {
    if (algorithm === 'token-bucket') {
      const cap = limit + burstSize;
      tokenRef.current = cap;
      setTokenCount(cap);
    } else if (algorithm === 'leaky-bucket') {
      queueRef.current = 0;
      setQueueDepth(0);
    } else {
      windowRef.current = 0;
      setWindowCount(0);
    }
  }, [algorithm, limit, burstSize]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      // Step 1: refill / reset / leak
      if (algorithm === 'token-bucket') {
        const cap = limit + burstSize;
        tokenRef.current = Math.min(cap, tokenRef.current + limit);
      } else if (algorithm === 'leaky-bucket') {
        queueRef.current = Math.max(0, queueRef.current - limit);
      } else {
        windowRef.current = 0; // new window
      }

      // Step 2: process `requestRate` requests
      let allowed = 0;
      let rejected = 0;
      const dots: FlowDot[] = [];

      for (let i = 0; i < requestRate; i++) {
        let ok = false;
        if (algorithm === 'token-bucket') {
          if (tokenRef.current >= 1) {
            tokenRef.current--;
            ok = true;
          }
        } else if (algorithm === 'leaky-bucket') {
          const cap = burstSize + 1;
          if (queueRef.current < cap) {
            queueRef.current++;
            ok = true;
          }
        } else {
          if (windowRef.current < limit) {
            windowRef.current++;
            ok = true;
          }
        }
        if (ok) allowed++;
        else rejected++;

        // Build a flow dot for visual — cap at 12 visible
        if (i < 12) {
          dots.push({ id: Date.now() + i, allowed: ok });
        }
      }

      // Sync display state
      setTokenCount(tokenRef.current);
      setQueueDepth(queueRef.current);
      setWindowCount(windowRef.current);

      setAllowedThisTick(allowed);
      setRejectedThisTick(rejected);
      setTotalAllowed((p) => p + allowed);
      setTotalRejected((p) => p + rejected);
      setFlowDots(dots);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [requestRate, limit, burstSize, algorithm, paused]);

  const totalSeen = totalAllowed + totalRejected;
  const rejectionRate = totalSeen > 0 ? Math.round((totalRejected / totalSeen) * 100) : 0;
  const tokenCapacity = limit + burstSize;
  const tokenFillPct = Math.round((tokenCount / Math.max(1, tokenCapacity)) * 100);

  function handleReset() {
    setRequestRate(DEFAULTS.requestRate);
    setLimit(DEFAULTS.limit);
    setBurstSize(DEFAULTS.burstSize);
    setAlgorithm(DEFAULTS.algorithm);
    setTotalAllowed(0);
    setTotalRejected(0);
    setAllowedThisTick(0);
    setRejectedThisTick(0);
    setPaused(false);
    setFlowDots([]);
    // The algorithm-change effect above will reset the internal state.
    const cap = DEFAULTS.limit + DEFAULTS.burstSize;
    tokenRef.current = cap;
    queueRef.current = 0;
    windowRef.current = 0;
    setTokenCount(cap);
    setQueueDepth(0);
    setWindowCount(0);
  }

  const explanation = useMemo(() => {
    const overLimit = requestRate > limit;
    if (!overLimit) {
      return (
        <>
          Incoming rate ({requestRate}/s) is within the limit ({limit}/s). The limiter lets every
          request through. The bucket / queue / window isn&apos;t being stressed.
        </>
      );
    }
    if (algorithm === 'token-bucket') {
      return (
        <>
          {requestRate}/s exceeds the steady-state limit of {limit}/s. The token bucket is draining
          its burst reserve — currently at <strong>{Math.round(tokenCount)}</strong> of{' '}
          {tokenCapacity} tokens. Once empty, only {limit}/s are allowed; the rest are rejected.
          Burst absorbs short spikes; steady state enforces the limit.
        </>
      );
    }
    if (algorithm === 'leaky-bucket') {
      return (
        <>
          {requestRate}/s exceeds the leak rate of {limit}/s. The queue is filling — currently{' '}
          {queueDepth} of {burstSize + 1} slots used. Once full, excess requests are rejected
          outright. The leaky bucket smooths bursts into a steady {limit}/s output stream.
        </>
      );
    }
    return (
      <>
        {requestRate}/s exceeds the {limit}/s window cap. The first {limit} requests in this
        1-second window are allowed; the remaining {rejectedThisTick} are rejected. Fixed-window is
        the simplest to reason about but allows bursty traffic at window boundaries (the{' '}
        <em>thundering herd</em> at the start of each window).
      </>
    );
  }, [
    requestRate,
    limit,
    algorithm,
    tokenCount,
    tokenCapacity,
    queueDepth,
    burstSize,
    rejectedThisTick,
  ]);

  const guidedScenario: GuidedScenario = {
    title: 'Push past the limit',
    description:
      'Set request rate higher than the limit and watch each algorithm reject differently. Token-bucket absorbs the burst first; fixed-window rejects immediately once the cap is hit.',
    action: {
      label: 'Crank traffic to 80/s',
      onClick: () => setRequestRate(80),
    },
    question:
      'If your API can handle 50 req/s and you cap at 20, why does the user experience differ between token-bucket (smooth) and fixed-window (bursty at window edges)?',
  };

  const relatedConcepts: RelatedConcept[] = [
    { slug: 'rate-limiting', title: 'Rate Limiting' },
    { slug: 'throttling', title: 'Throttling' },
    { slug: 'api-gateway', title: 'API Gateway' },
    { slug: 'back-pressure', title: 'Back-Pressure' },
  ];

  return (
    <LabFramework
      eyebrow="Lab 05 · Rate Limiter"
      title="Protect a service from being overwhelmed"
      subtitle="Three algorithms. One traffic spike. Each one rejects differently."
      problem={
        <>
          A single client with a buggy retry loop can take down an entire API. A{' '}
          <strong>rate limiter</strong> sits in front of a service and decides, per request, whether
          to let it through. The hard part isn&apos;t the counting — it&apos;s choosing an
          algorithm that matches your traffic shape: <em>token-bucket</em> allows short bursts but
          enforces a long-run rate, <em>leaky-bucket</em> smooths everything into a steady stream,
          and <em>fixed-window</em> is dead-simple but spike-prone at window boundaries.
        </>
      }
      canvas={
        <div className="space-y-4">
          {/* Incoming → limiter → outcome */}
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 flex-col items-center gap-1 rounded-md border border-border bg-surface-inset px-2.5 py-2">
              <Activity className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                In
              </span>
              <span className="tnum text-[11px] font-semibold text-text-primary">
                {requestRate}/s
              </span>
            </div>

            {/* Flow dots */}
            <div className="relative h-12 flex-1 overflow-hidden" aria-hidden>
              <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              {flowDots.map((d, i) => (
                <span
                  key={d.id}
                  className={cn(
                    'lab-dot-flow absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full',
                    d.allowed ? 'bg-success' : 'bg-danger'
                  )}
                  style={
                    {
                      left: `${(i / Math.max(1, flowDots.length)) * 60}%`,
                      '--lab-flow-distance': '90px',
                      '--lab-flow-duration': '1100ms',
                      animationDelay: `${(i / Math.max(1, flowDots.length)) * 1100}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1 rounded-md border border-border-strong bg-accent-soft/30 px-2.5 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                Limiter
              </span>
              <span className="text-[10px] text-text-muted">{algorithm}</span>
            </div>
          </div>

          {/* Algorithm-specific visualization */}
          <div className="rounded-md border border-border bg-surface-inset p-3">
            {algorithm === 'token-bucket' && (
              <TokenBucketViz tokens={tokenCount} capacity={tokenCapacity} limit={limit} fillPct={tokenFillPct} />
            )}
            {algorithm === 'leaky-bucket' && (
              <LeakyBucketViz depth={queueDepth} capacity={burstSize + 1} leakRate={limit} />
            )}
            {algorithm === 'fixed-window' && (
              <FixedWindowViz count={windowCount} limit={limit} />
            )}
          </div>

          {/* Outcome strip */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft/30 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Allowed</div>
                <div className="tnum text-sm font-semibold text-success">{allowedThisTick}/s</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft/30 p-2.5">
              <XCircle className="h-4 w-4 text-danger" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Rejected</div>
                <div className="tnum text-sm font-semibold text-danger">{rejectedThisTick}/s</div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-text-faint">
            Green dots = allowed, red dots = rejected. Internal state visualization updates each
            tick.
          </p>
        </div>
      }
      controls={
        <>
          <SliderControl
            label="Request rate"
            value={requestRate}
            min={1}
            max={100}
            unit=" req/s"
            onChange={setRequestRate}
          />
          <SliderControl
            label="Limit (steady rate)"
            value={limit}
            min={1}
            max={100}
            unit=" req/s"
            onChange={setLimit}
          />
          <SliderControl
            label="Burst size"
            value={burstSize}
            min={0}
            max={20}
            onChange={setBurstSize}
            disabled={algorithm === 'fixed-window'}
            hint={
              algorithm === 'fixed-window'
                ? 'Not applicable to fixed-window'
                : 'Extra capacity above the steady rate'
            }
          />
          <SegmentedControl
            label="Algorithm"
            value={algorithm}
            onChange={(v) => setAlgorithm(v)}
            options={[
              { value: 'token-bucket', label: 'Token bucket' },
              { value: 'leaky-bucket', label: 'Leaky bucket' },
              { value: 'fixed-window', label: 'Fixed window' },
            ]}
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
            label="Allowed (total)"
            value={totalAllowed.toLocaleString()}
            hint={`${allowedThisTick} this tick`}
            tone="success"
          />
          <MetricRow
            label="Rejected (total)"
            value={totalRejected.toLocaleString()}
            hint={`${rejectedThisTick} this tick`}
            tone={rejectedThisTick > 0 ? 'danger' : 'default'}
          />
          <MetricRow
            label="Rejection rate"
            value={`${rejectionRate}%`}
            tone={rejectionRate > 30 ? 'danger' : rejectionRate > 0 ? 'warning' : 'success'}
          />
          <MetricRow
            label="Current allowed rate"
            value={`${allowedThisTick} req/s`}
            tone="accent"
          />
          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <Gauge className="h-3 w-3" /> Algorithm state
            </div>
            <div className="space-y-1 text-xs">
              {algorithm === 'token-bucket' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-text-secondary">
                    <Droplet className="h-3 w-3" /> Tokens
                  </span>
                  <span className="tnum font-semibold text-text-primary">
                    {Math.round(tokenCount)} / {tokenCapacity}
                  </span>
                </div>
              )}
              {algorithm === 'leaky-bucket' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-text-secondary">
                    <Timer className="h-3 w-3" /> Queue depth
                  </span>
                  <span className="tnum font-semibold text-text-primary">
                    {queueDepth} / {burstSize + 1}
                  </span>
                </div>
              )}
              {algorithm === 'fixed-window' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-text-secondary">
                    <Activity className="h-3 w-3" /> Window count
                  </span>
                  <span className="tnum font-semibold text-text-primary">
                    {windowCount} / {limit}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      }
      explanation={explanation}
      guidedScenario={guidedScenario}
      takeaway={
        <>
          Rate limiting is the <strong>server&apos;s seat belt</strong>: it doesn&apos;t make you
          faster, it stops you from dying. Algorithm choice is a tradeoff between simplicity and
          fairness — token-bucket is the safe default because it tolerates short bursts while still
          enforcing a long-run cap. Fixed-window is easiest to implement but worst under bursty
          traffic. Leaky-bucket produces the smoothest downstream load but adds queueing delay.
        </>
      }
      relatedConcepts={relatedConcepts}
      onReset={handleReset}
    />
  );
}

/** Vertical bucket bar showing token fill level. */
function TokenBucketViz({
  tokens,
  capacity,
  limit,
  fillPct,
}: {
  tokens: number;
  capacity: number;
  limit: number;
  fillPct: number;
}) {
  // The `limit` portion of capacity is shaded as "steady state", the rest is "burst".
  const steadyPct = Math.round((limit / Math.max(1, capacity)) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-20 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-subtle">
        {/* Steady-state zone marker */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-border-strong"
          style={{ bottom: `${steadyPct}%` }}
        />
        <div
          className="lab-bar absolute bottom-0 left-0 right-0 bg-accent"
          style={{ height: `${fillPct}%` }}
        />
        <div className="absolute inset-x-0 top-0.5 text-center text-[9px] font-semibold text-text-muted">
          {Math.round(tokens)}
        </div>
      </div>
      <div className="flex-1 space-y-1 text-xs text-text-secondary">
        <div className="flex items-center justify-between">
          <span>Bucket capacity</span>
          <span className="tnum font-semibold text-text-primary">{capacity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Refill rate</span>
          <span className="tnum font-semibold text-text-primary">{limit}/s</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Steady state</span>
          <span className="tnum font-semibold text-text-primary">
            ≤ {limit}/s allowed
          </span>
        </div>
        <p className="pt-1 text-[10px] leading-snug text-text-muted">
          Each request consumes 1 token. Bucket refills at the limit rate, capped at capacity.
        </p>
      </div>
    </div>
  );
}

/** Horizontal queue bar showing pending items. */
function LeakyBucketViz({
  depth,
  capacity,
  leakRate,
}: {
  depth: number;
  capacity: number;
  leakRate: number;
}) {
  const pct = Math.round((depth / Math.max(1, capacity)) * 100);
  return (
    <div className="space-y-2">
      <div className="relative h-6 w-full overflow-hidden rounded-md border border-border bg-surface-subtle">
        <div
          className="lab-bar absolute left-0 top-0 bottom-0 bg-warning"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-semibold">
          <span className="text-text-secondary">queue: {depth}</span>
          <span className="text-text-muted">cap: {capacity}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>Leak rate: <span className="tnum font-semibold text-text-primary">{leakRate}/s</span></span>
        <span>Output: <span className="tnum font-semibold text-text-primary">{Math.min(depth, leakRate)}/s</span></span>
      </div>
      <p className="text-[10px] leading-snug text-text-muted">
        Requests enter the queue if there&apos;s room. The queue leaks at the steady rate,
        smoothing bursts into a constant output stream.
      </p>
    </div>
  );
}

/** Counter showing requests in the current window. */
function FixedWindowViz({ count, limit }: { count: number; limit: number }) {
  const pct = Math.round((count / Math.max(1, limit)) * 100);
  const over = count >= limit;
  return (
    <div className="space-y-2">
      <div className="relative h-6 w-full overflow-hidden rounded-md border border-border bg-surface-subtle">
        <div
          className={cn('lab-bar absolute left-0 top-0 bottom-0', over ? 'bg-danger' : 'bg-success')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-semibold">
          <span className="text-text-secondary">count: {count}</span>
          <span className="text-text-muted">cap: {limit}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>Window: <span className="tnum font-semibold text-text-primary">1s</span></span>
        <span>
          State:{' '}
          <span
            className={cn(
              'tnum font-semibold',
              over ? 'text-danger' : 'text-success'
            )}
          >
            {over ? 'cap reached' : 'open'}
          </span>
        </span>
      </div>
      <p className="text-[10px] leading-snug text-text-muted">
        Count resets every second. Once {limit} requests land in a window, the rest are rejected
        until the next window opens.
      </p>
    </div>
  );
}

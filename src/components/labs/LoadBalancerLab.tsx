'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ServerCrash, Activity, Zap, AlertTriangle, Gauge } from 'lucide-react';
import {
  LabFramework,
  MetricRow,
  SliderControl,
  SegmentedControl,
  type GuidedScenario,
  type RelatedConcept,
} from './LabFramework';
import { cn } from '@/lib/utils';

type Algorithm = 'round-robin' | 'least-connections' | 'random';

interface ServerState {
  id: number;
  totalRequests: number;
  requestsThisTick: number;
  connections: number;
}

const SERVER_CAPACITY = 50; // req/s per server
const TICK_MS = 1000;

const DEFAULTS = {
  trafficRate: 20,
  serverCount: 4,
  algorithm: 'round-robin' as Algorithm,
};

function makeServers(n: number): ServerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    totalRequests: 0,
    requestsThisTick: 0,
    connections: 0,
  }));
}

/** Determine per-server utilization color based on load vs capacity. */
function serverTone(load: number, failed: boolean): 'green' | 'amber' | 'red' {
  if (failed) return 'red';
  const util = load / SERVER_CAPACITY;
  if (util > 1) return 'red';
  if (util > 0.7) return 'amber';
  return 'green';
}

const toneRing: Record<string, string> = {
  green: 'border-success/40',
  amber: 'border-warning/60',
  red: 'border-danger/70',
};
const toneBar: Record<string, string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-danger',
};
const toneBadge: Record<string, string> = {
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-danger',
};

export function LoadBalancerLab() {
  const [trafficRate, setTrafficRate] = useState(DEFAULTS.trafficRate);
  const [serverCount, setServerCount] = useState(DEFAULTS.serverCount);
  const [algorithm, setAlgorithm] = useState<Algorithm>(DEFAULTS.algorithm);
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());

  const [servers, setServers] = useState<ServerState[]>(() => makeServers(DEFAULTS.serverCount));
  const [totalRequests, setTotalRequests] = useState(0);
  const [failedRequests, setFailedRequests] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [lastDistributed, setLastDistributed] = useState(0);
  const [paused, setPaused] = useState(false);

  const serversRef = useRef(servers);
  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  // Tick — distribute traffic across healthy servers using the selected algorithm.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const current = serversRef.current;
      const next = current.map((s) => ({ ...s, requestsThisTick: 0 }));
      const healthyIndices: number[] = [];
      next.forEach((s, i) => {
        if (!failedServers.has(i)) healthyIndices.push(i);
      });

      let totalReqs = 0;
      let failedReqs = 0;

      if (healthyIndices.length === 0) {
        failedReqs = trafficRate;
      } else {
        for (let i = 0; i < trafficRate; i++) {
          let targetIdx: number;
          if (algorithm === 'round-robin') {
            targetIdx = healthyIndices[i % healthyIndices.length];
          } else if (algorithm === 'random') {
            targetIdx = healthyIndices[Math.floor(Math.random() * healthyIndices.length)];
          } else {
            // least-connections: pick the healthy server with the lowest current connection count
            targetIdx = healthyIndices.reduce((minIdx, idx) => {
              return next[idx].connections < next[minIdx].connections ? idx : minIdx;
            }, healthyIndices[0]);
          }
          next[targetIdx].requestsThisTick++;
          next[targetIdx].connections++;
          next[targetIdx].totalRequests++;
          totalReqs++;
        }
        // Decay connections so the least-connections algorithm picks up changes over time.
        next.forEach((s) => {
          s.connections = Math.max(0, s.connections - Math.ceil(s.connections * 0.3));
        });
      }

      // Average latency: 20ms baseline + non-linear growth with utilization.
      let totalLat = 0;
      let totalLoad = 0;
      next.forEach((s, i) => {
        if (failedServers.has(i) || s.requestsThisTick === 0) return;
        const util = s.requestsThisTick / SERVER_CAPACITY;
        const lat = 20 + util * util * 100;
        totalLat += lat * s.requestsThisTick;
        totalLoad += s.requestsThisTick;
      });
      const avgLat = totalLoad > 0 ? totalLat / totalLoad : 0;

      setServers(next);
      setTotalRequests((prev) => prev + totalReqs);
      setFailedRequests((prev) => prev + failedReqs);
      setAvgLatency(avgLat);
      setLastDistributed(totalReqs);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [trafficRate, algorithm, failedServers, paused]);

  const healthyCount = serverCount - failedServers.size;
  const maxLoad = Math.max(1, ...servers.map((s) => s.requestsThisTick));
  const utilization = serverCount > 0 ? trafficRate / (healthyCount * SERVER_CAPACITY) : 0;

  function handleServerCount(n: number) {
    setServerCount(n);
    setServers(makeServers(n));
    setFailedServers(new Set());
    setTotalRequests(0);
    setFailedRequests(0);
    setAvgLatency(0);
    setLastDistributed(0);
  }

  function handleToggleFailed(id: number) {
    setFailedServers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleReset() {
    setTrafficRate(DEFAULTS.trafficRate);
    setServerCount(DEFAULTS.serverCount);
    setAlgorithm(DEFAULTS.algorithm);
    setFailedServers(new Set());
    setServers(makeServers(DEFAULTS.serverCount));
    setTotalRequests(0);
    setFailedRequests(0);
    setAvgLatency(0);
    setLastDistributed(0);
    setPaused(false);
  }

  // Per-server counts for display
  const perServerRows = servers.map((s, i) => {
    const failed = failedServers.has(i);
    const tone = serverTone(s.requestsThisTick, failed);
    const utilPct = failed ? 0 : Math.min(100, (s.requestsThisTick / SERVER_CAPACITY) * 100);
    return { id: i, server: s, failed, tone, utilPct };
  });

  const explanation = useMemo(() => {
    if (healthyCount === 0) {
      return (
        <>
          Every server is marked failed. The load balancer has nowhere to route traffic, so{' '}
          <strong className="text-danger">{trafficRate} requests/s are being dropped</strong>.
          Even a perfect algorithm cannot recover availability without at least one healthy
          upstream — this is why health checks and circuit breakers exist.
        </>
      );
    }
    if (failedServers.size > 0) {
      return (
        <>
          The load balancer is routing around <strong>{failedServers.size} failed server(s)</strong>{' '}
          using the <code className="rounded bg-surface-inset px-1">{algorithm}</code> algorithm.{' '}
          Traffic is spread across the remaining <strong>{healthyCount} healthy server(s)</strong>,
          but each one now carries a bigger share of the load.
        </>
      );
    }
    if (utilization > 1) {
      return (
        <>
          The cluster is <strong className="text-danger">over capacity</strong>: incoming rate is{' '}
          {trafficRate} req/s but the healthy pool can only handle{' '}
          {healthyCount * SERVER_CAPACITY} req/s. Servers are turning red, latency is climbing
          non-linearly. Add capacity or shed load.
        </>
      );
    }
    if (utilization > 0.7) {
      return (
        <>
          The cluster is running <strong className="text-warning">hot</strong> at ~
          {Math.round(utilization * 100)}% utilization across {healthyCount} server(s). Every
          request still succeeds, but you&apos;re one traffic spike away from degradation.
        </>
      );
    }
    return (
      <>
        {trafficRate} req/s are being distributed across {healthyCount} healthy server(s) using the{' '}
        <code className="rounded bg-surface-inset px-1">{algorithm}</code> algorithm. Each server
        is running at ~{Math.round(utilization * 100)}% of its {SERVER_CAPACITY} req/s capacity.
      </>
    );
  }, [algorithm, trafficRate, healthyCount, failedServers.size, utilization]);

  const guidedScenario: GuidedScenario = {
    title: 'Traffic suddenly doubles',
    description:
      'Black Friday. Your marketing team just launched a flash sale. Hit the button to double the current traffic rate and watch what happens to per-server utilization and average latency.',
    action: {
      label: 'Double traffic',
      onClick: () => setTrafficRate((r) => Math.min(100, r * 2)),
    },
    question:
      'When traffic doubles, what is the cheapest way to keep latency under 100ms — add more servers, switch algorithms, or shed non-essential traffic?',
  };

  const relatedConcepts: RelatedConcept[] = [
    { slug: 'load-balancers', title: 'Load Balancers' },
    { slug: 'horizontal-scaling', title: 'Horizontal Scaling' },
    { slug: 'health-monitoring', title: 'Health Monitoring' },
    { slug: 'circuit-breaker', title: 'Circuit Breaker' },
  ];

  return (
    <LabFramework
      eyebrow="Lab 01 · Load Balancer"
      title="Distribute traffic across a server pool"
      subtitle="Three algorithms. One dial to crash it. Watch how each strategy spreads load — and where each one breaks."
      problem={
        <>
          A single server can only handle so many requests before it melts. The naive fix — buy a
          bigger box — hits a ceiling fast. A <strong>load balancer</strong> sits in front of N
          identical servers and decides, for every incoming request, which server should handle it.
          The hard part isn&apos;t the routing: it&apos;s doing it <em>fairly</em>,{' '}
          <em>without a single point of failure</em>, and <em>without sending traffic to a dead
          server</em>.
        </>
      }
      canvas={
        <div className="space-y-4">
          {/* Traffic source */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium">{trafficRate} req/s incoming</span>
            </div>
            <FlowDots count={Math.min(8, Math.ceil(trafficRate / 8))} tone="accent" />
          </div>

          {/* Load balancer bar */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 flex-1 items-center justify-center rounded-md border border-border-strong bg-surface-inset px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
              <Activity className="mr-1.5 h-3.5 w-3.5 text-accent" />
              LB · {algorithm}
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-[11px] font-medium text-text-secondary hover:border-border-strong hover:text-text-primary"
              aria-pressed={paused}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>

          {/* Servers grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {perServerRows.map(({ id, server, failed, tone, utilPct }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleToggleFailed(id)}
                aria-pressed={failed}
                aria-label={`Toggle server ${id + 1} failed state`}
                className={cn(
                  'relative flex flex-col gap-2 rounded-lg border bg-surface p-2.5 text-left transition-all hover:border-border-strong',
                  toneRing[tone],
                  failed && 'lab-fail-pulse',
                  !failed && tone === 'amber' && 'lab-warn-pulse'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-text-secondary">
                    S{id + 1}
                  </span>
                  <span
                    className={cn(
                      'tnum rounded px-1 py-0.5 text-[10px] font-semibold',
                      toneBadge[tone]
                    )}
                  >
                    {failed ? (
                      <span className="flex items-center gap-0.5">
                        <ServerCrash className="h-2.5 w-2.5" /> DOWN
                      </span>
                    ) : (
                      `${server.requestsThisTick}/s`
                    )}
                  </span>
                </div>

                {/* Utilization bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className={cn('lab-bar h-full rounded-full', toneBar[tone])}
                    style={{ width: `${failed ? 0 : utilPct}%` }}
                  />
                </div>

                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] text-text-faint">total</span>
                  <span className="tnum text-[11px] font-medium text-text-primary">
                    {server.totalRequests.toLocaleString()}
                  </span>
                </div>

                {failed && (
                  <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-danger" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-text-faint">
            Tap any server to mark it failed. Capacity per server: {SERVER_CAPACITY} req/s.
          </p>
        </div>
      }
      controls={
        <>
          <SliderControl
            label="Traffic rate"
            value={trafficRate}
            min={1}
            max={100}
            unit=" req/s"
            onChange={setTrafficRate}
          />
          <SliderControl
            label="Server count"
            value={serverCount}
            min={1}
            max={8}
            onChange={handleServerCount}
          />
          <SegmentedControl
            label="Algorithm"
            value={algorithm}
            onChange={(v) => setAlgorithm(v)}
            options={[
              { value: 'round-robin', label: 'Round-robin' },
              { value: 'least-connections', label: 'Least-conn' },
              { value: 'random', label: 'Random' },
            ]}
          />
          <div className="rounded-md border border-border bg-surface-inset p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <ServerCrash className="h-3 w-3" /> Failed servers
            </div>
            {failedServers.size === 0 ? (
              <p className="text-xs text-text-secondary">
                None. Tap a server in the canvas to fail it.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {Array.from(failedServers).map((id) => (
                  <button
                    key={id}
                    onClick={() => handleToggleFailed(id)}
                    className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[10px] font-medium text-danger hover:bg-danger-soft/70"
                  >
                    S{id + 1} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
      metrics={
        <>
          <MetricRow
            label="Total requests served"
            value={totalRequests.toLocaleString()}
            hint={`+${lastDistributed} this tick`}
            tone="accent"
          />
          <MetricRow
            label="Failed requests"
            value={failedRequests.toLocaleString()}
            tone={failedRequests > 0 ? 'danger' : 'default'}
          />
          <MetricRow
            label="Avg latency"
            value={`${avgLatency.toFixed(0)} ms`}
            tone={avgLatency > 80 ? 'danger' : avgLatency > 50 ? 'warning' : 'success'}
          />
          <MetricRow
            label="Cluster utilization"
            value={`${Math.round(utilization * 100)}%`}
            tone={utilization > 1 ? 'danger' : utilization > 0.7 ? 'warning' : 'success'}
          />
          <MetricRow
            label="Healthy servers"
            value={`${healthyCount}/${serverCount}`}
            tone={healthyCount === 0 ? 'danger' : 'default'}
          />
          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <Gauge className="h-3 w-3" /> Per-server load
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {servers.map((s, i) => {
                const failed = failedServers.has(i);
                const tone = serverTone(s.requestsThisTick, failed);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-6 shrink-0 text-text-muted">S{i + 1}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                      <div
                        className={cn('lab-bar h-full rounded-full', toneBar[tone])}
                        style={{
                          width: `${
                            failed
                              ? 0
                              : Math.min(100, (s.requestsThisTick / SERVER_CAPACITY) * 100)
                          }%`,
                        }}
                      />
                    </div>
                    <span className="tnum w-10 shrink-0 text-right text-text-secondary">
                      {s.requestsThisTick}/s
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      }
      explanation={explanation}
      guidedScenario={guidedScenario}
      takeaway={
        <>
          A load balancer&apos;s job is not just to <em>send</em> traffic — it&apos;s to{' '}
          <strong>send traffic only to servers that can handle it</strong>. Health checks +
          algorithm choice + capacity headroom are the three levers. None of them alone is enough;
          round-robin on a cluster with a dead server is worse than random routing that knows who&apos;s
          alive.
        </>
      }
      relatedConcepts={relatedConcepts}
      onReset={handleReset}
    />
  );
}

/** Row of small dots flowing left → right, used at the top of the canvas. */
function FlowDots({ count, tone }: { count: number; tone: 'accent' | 'success' }) {
  const colorClass = tone === 'accent' ? 'bg-accent' : 'bg-success';
  return (
    <div className="relative h-3 flex-1 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn('lab-dot-flow absolute top-1 h-1.5 w-1.5 rounded-full', colorClass)}
          style={
            {
              left: `${(i / count) * 100}%`,
              '--lab-flow-distance': '32px',
              '--lab-flow-duration': '1200ms',
              animationDelay: `${(i / count) * 1200}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Database,
  Server,
  ArrowDown,
  Zap,
  Clock,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  LabFramework,
  MetricRow,
  SliderControl,
  type GuidedScenario,
  type RelatedConcept,
} from './LabFramework';
import { cn } from '@/lib/utils';

const TICK_MS = 1000;
const OPS_PER_TICK = 100;
const LAG_MAX_MS = 5000;
const STALE_THRESHOLD_MS = 1000; // reads on replicas older than this are "stale"

const DEFAULTS = {
  replicaCount: 3,
  readWriteRatio: 80, // % reads
  replicationLag: 200, // ms
};

export function ReplicationLab() {
  const [replicaCount, setReplicaCount] = useState(DEFAULTS.replicaCount);
  const [readWriteRatio, setReadWriteRatio] = useState(DEFAULTS.readWriteRatio);
  const [replicationLag, setReplicationLag] = useState(DEFAULTS.replicationLag);

  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [failingOver, setFailingOver] = useState(false);
  const [failoverProgress, setFailoverProgress] = useState(0);

  const [totalReads, setTotalReads] = useState(0);
  const [totalWrites, setTotalWrites] = useState(0);
  const [staleReads, setStaleReads] = useState(0);
  const [failedWrites, setFailedWrites] = useState(0);
  const [tickReads, setTickReads] = useState(0);
  const [tickWrites, setTickWrites] = useState(0);
  const [tickStale, setTickStale] = useState(0);
  const [paused, setPaused] = useState(false);

  // Failover timer — takes ~3 seconds to promote a replica.
  useEffect(() => {
    if (!failingOver) return;
    if (failoverProgress >= 100) {
      setFailingOver(false);
      setPrimaryFailed(false);
      setFailoverProgress(0);
      return;
    }
    const id = setTimeout(() => setFailoverProgress((p) => Math.min(100, p + 33)), 1000);
    return () => clearTimeout(id);
  }, [failingOver, failoverProgress]);

  const statsRef = useRef({ totalReads, totalWrites, staleReads, failedWrites });
  useEffect(() => {
    statsRef.current = { totalReads, totalWrites, staleReads, failedWrites };
  }, [totalReads, totalWrites, staleReads, failedWrites]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const reads = Math.round((readWriteRatio / 100) * OPS_PER_TICK);
      const writes = OPS_PER_TICK - reads;

      // If primary is failed and we're not failing over, all writes fail.
      const writesSucceeded = primaryFailed && !failingOver ? 0 : writes;
      const writesFailed = writes - writesSucceeded;

      // Reads: split across primary + replicas when healthy.
      // When primary failed, all reads go to replicas (potentially stale).
      const totalNodes = replicaCount + 1;
      let replicaReads: number;
      let primaryReads: number;
      if (primaryFailed) {
        replicaReads = reads;
        primaryReads = 0;
      } else {
        // Proportional: each node takes 1/(N+1) of reads
        primaryReads = Math.round(reads / totalNodes);
        replicaReads = reads - primaryReads;
      }

      // Stale read chance on a replica = clamp(lag / LAG_MAX_MS, 0, 1)
      // Stale reads ≈ replicaReads * staleChance
      const staleChance = Math.min(1, Math.max(0, replicationLag / LAG_MAX_MS));
      const stale = Math.round(replicaReads * staleChance);

      setTotalReads((p) => p + reads);
      setTotalWrites((p) => p + writesSucceeded);
      setStaleReads((p) => p + stale);
      setFailedWrites((p) => p + writesFailed);
      setTickReads(reads);
      setTickWrites(writesSucceeded);
      setTickStale(stale);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [readWriteRatio, replicaCount, replicationLag, primaryFailed, failingOver, paused]);

  // Derived metrics
  const totalNodes = replicaCount + 1;
  const primaryReadShare = primaryFailed ? 0 : Math.round((1 / totalNodes) * 100);
  const replicaReadShare = primaryFailed ? 100 : 100 - primaryReadShare;
  const staleChancePct = Math.round(Math.min(1, replicationLag / LAG_MAX_MS) * 100);
  // Availability = % of ops that succeed. Writes fail when primary is down.
  const writeAvailability = primaryFailed && !failingOver ? 0 : 100;
  const readAvailability = 100; // reads always succeed (replicas remain available)
  // Overall availability weighted by the read/write mix
  const overallAvailability = primaryFailed
    ? Math.round((readWriteRatio * 100 + (1 - readWriteRatio / 100) * 100 * writeAvailability) / 100)
    : 100;

  const isStaleLag = replicationLag > STALE_THRESHOLD_MS;

  function handleReset() {
    setReplicaCount(DEFAULTS.replicaCount);
    setReadWriteRatio(DEFAULTS.readWriteRatio);
    setReplicationLag(DEFAULTS.replicationLag);
    setPrimaryFailed(false);
    setFailingOver(false);
    setFailoverProgress(0);
    setTotalReads(0);
    setTotalWrites(0);
    setStaleReads(0);
    setFailedWrites(0);
    setTickReads(0);
    setTickWrites(0);
    setTickStale(0);
    setPaused(false);
  }

  function handleFailPrimary() {
    if (failingOver) return;
    setPrimaryFailed(true);
  }
  function handlePromoteReplica() {
    if (!primaryFailed || failingOver) return;
    setFailingOver(true);
    setFailoverProgress(0);
  }

  const explanation = useMemo(() => {
    if (failingOver) {
      return (
        <>
          Failover in progress — promoting a replica to be the new primary. Until promotion completes,
          writes are blocked. This is why <strong>automatic leader election</strong> matters: the
          gap between detection and recovery is your write downtime.
        </>
      );
    }
    if (primaryFailed) {
      return (
        <>
          The primary is <strong className="text-danger">down</strong>. Writes are failing (your
          users are seeing errors on every mutation). Reads still succeed because the{' '}
          {replicaCount} replica(s) are up — but every one of them is potentially{' '}
          {staleChancePct}% stale because replication stopped when the primary died. Promote a
          replica to recover writes.
        </>
      );
    }
    if (isStaleLag && replicaCount > 0) {
      return (
        <>
          {tickReads} reads/s are being served, ~{replicaReadShare}% from replicas. With replication
          lag at {replicationLag}ms, about <strong className="text-warning">{staleChancePct}% of
          replica reads are stale</strong>. That&apos;s fine for a feed, catastrophic for a
          balance check.
        </>
      );
    }
    return (
      <>
        {tickReads} reads/s and {tickWrites} writes/s flowing. Writes hit the primary; reads are
        spread across the primary and {replicaCount} replica(s) at {primaryReadShare}/{replicaReadShare}%
        split. Lag is low ({replicationLag}ms) — stale reads are negligible.
      </>
    );
  }, [
    primaryFailed,
    failingOver,
    replicaCount,
    tickReads,
    tickWrites,
    replicationLag,
    isStaleLag,
    staleChancePct,
    replicaReadShare,
    primaryReadShare,
  ]);

  const guidedScenario: GuidedScenario = {
    title: 'Survive a primary failure',
    description:
      'Hit "Fail primary" — every write starts failing. Then click "Promote replica" to failover. The gap between those two clicks is your downtime.',
    action: {
      label: primaryFailed ? 'Promote replica' : 'Fail primary',
      onClick: primaryFailed ? handlePromoteReplica : handleFailPrimary,
    },
    question:
      'If your reads can tolerate a 5s staleness but writes cannot, where do you send reads vs writes? What is the smallest replication lag you can afford?',
  };

  const relatedConcepts: RelatedConcept[] = [
    { slug: 'replication', title: 'Replication' },
    { slug: 'failover', title: 'Failover' },
    { slug: 'leader-election', title: 'Leader Election' },
    { slug: 'consistency-patterns', title: 'Consistency Patterns' },
  ];

  // Visual — primary box + arrows + replica boxes
  const lagWidthPct = Math.min(100, (replicationLag / LAG_MAX_MS) * 100);

  return (
    <LabFramework
      eyebrow="Lab 04 · Replication"
      title="Copy data so one failure doesn't take you down"
      subtitle="Writes go to the primary. Reads can come from anywhere. Lag is the tax you pay."
      problem={
        <>
          A single database is a single point of failure: if it dies, every read and write dies
          with it. <strong>Replication</strong> copies writes from a primary to N replicas in real
          time. Reads can now hit any copy — which means you scale read capacity and survive a
          primary crash. The tradeoff: replicas are <em>eventually</em> consistent. Between a write
          landing on the primary and that write reaching a replica, there is a window where the
          replica will serve old data. The size of that window is the{' '}
          <strong>replication lag</strong>.
        </>
      }
      canvas={
        <div className="space-y-4">
          {/* Topology: primary → replicas */}
          <div className="flex flex-col items-center gap-2">
            {/* Primary */}
            <div
              className={cn(
                'flex w-full max-w-xs flex-col items-center gap-1 rounded-lg border-2 px-4 py-3',
                primaryFailed
                  ? 'border-danger bg-danger-soft/40 lab-fail-pulse'
                  : 'border-accent/40 bg-accent-soft/40'
              )}
            >
              <div className="flex items-center gap-2 text-text-secondary">
                <Database className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Primary
                </span>
                {primaryFailed && (
                  <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-text-inverse">
                    FAILED
                  </span>
                )}
                {failingOver && (
                  <span className="flex items-center gap-1 rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-text-inverse">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    Promoting {failoverProgress}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3 text-[11px] text-text-muted">
                <span>
                  <span className="tnum font-semibold text-text-primary">{tickWrites}</span>
                  {' '}writes/s
                </span>
                <span>
                  <span className="tnum font-semibold text-text-primary">{primaryReadShare}%</span>
                  {' '}reads
                </span>
              </div>
            </div>

            {/* Arrow + lag indicator */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-text-faint">
                <ArrowDown className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-[0.12em]">replicate</span>
                <ArrowDown className="h-3 w-3" />
              </div>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className={cn(
                    'lab-bar h-full rounded-full',
                    isStaleLag ? 'bg-warning' : 'bg-success'
                  )}
                  style={{ width: `${lagWidthPct}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <Clock className="h-2.5 w-2.5 text-text-muted" />
                <span
                  className={cn(
                    'tnum font-medium',
                    isStaleLag ? 'text-warning' : 'text-text-muted'
                  )}
                >
                  lag {replicationLag}ms
                </span>
              </div>
            </div>

            {/* Replicas */}
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {Array.from({ length: replicaCount }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border bg-surface p-2',
                    isStaleLag ? 'border-warning/40' : 'border-success/40'
                  )}
                >
                  <Server className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                    R{i + 1}
                  </span>
                  <span className="tnum text-[10px] text-text-muted">
                    {Math.round(replicaReadShare / Math.max(1, replicaCount))}% reads
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status strip */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div
              className={cn(
                'rounded-md border p-2',
                primaryFailed ? 'border-danger bg-danger-soft/30' : 'border-border bg-surface-inset'
              )}
            >
              <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Writes</div>
              <div
                className={cn(
                  'tnum text-sm font-semibold',
                  primaryFailed ? 'text-danger' : 'text-success'
                )}
              >
                {primaryFailed ? '✗ failing' : '✓ ok'}
              </div>
            </div>
            <div
              className={cn(
                'rounded-md border p-2',
                isStaleLag ? 'border-warning bg-warning-soft/30' : 'border-border bg-surface-inset'
              )}
            >
              <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Stale risk</div>
              <div
                className={cn(
                  'tnum text-sm font-semibold',
                  isStaleLag ? 'text-warning' : 'text-success'
                )}
              >
                {staleChancePct}%
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface-inset p-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Availability</div>
              <div
                className={cn(
                  'tnum text-sm font-semibold',
                  overallAvailability < 100 ? 'text-warning' : 'text-success'
                )}
              >
                {overallAvailability}%
              </div>
            </div>
          </div>

          <p className="text-[10px] text-text-faint">
            Stale-read chance scales with replication lag. {OPS_PER_TICK} ops per tick; reads split
            across primary + replicas.
          </p>
        </div>
      }
      controls={
        <>
          <SliderControl
            label="Replica count"
            value={replicaCount}
            min={1}
            max={5}
            onChange={setReplicaCount}
          />
          <SliderControl
            label="Read / write mix"
            value={readWriteRatio}
            min={0}
            max={100}
            unit="% reads"
            onChange={setReadWriteRatio}
          />
          <SliderControl
            label="Replication lag"
            value={replicationLag}
            min={0}
            max={5000}
            step={100}
            unit="ms"
            onChange={setReplicationLag}
          />
          <div className="rounded-md border border-border bg-surface-inset p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <ShieldAlert className="h-3 w-3" /> Failure scenario
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleFailPrimary}
                disabled={primaryFailed || failingOver}
                className="flex-1 rounded-md border border-danger/40 bg-danger-soft/30 px-2 py-1.5 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft/60 disabled:opacity-40"
              >
                Fail primary
              </button>
              <button
                type="button"
                onClick={handlePromoteReplica}
                disabled={!primaryFailed || failingOver}
                className="flex-1 rounded-md border border-success/40 bg-success-soft/30 px-2 py-1.5 text-[11px] font-medium text-success transition-colors hover:bg-success-soft/60 disabled:opacity-40"
              >
                Promote replica
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-text-muted">
              {primaryFailed
                ? failingOver
                  ? `Failover in progress: ${failoverProgress}%. Writes are blocked.`
                  : 'Primary is down. Writes are failing. Promote a replica to recover.'
                : 'Primary is healthy. Reads are split across primary + replicas.'}
            </p>
          </div>
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
            label="Reads this tick"
            value={tickReads}
            hint={`${primaryReadShare}% primary · ${replicaReadShare}% replicas`}
            tone="accent"
          />
          <MetricRow
            label="Writes this tick"
            value={tickWrites}
            tone={primaryFailed ? 'danger' : 'success'}
          />
          <MetricRow
            label="Stale reads"
            value={tickStale}
            hint={`${staleChancePct}% of replica reads`}
            tone={isStaleLag ? 'warning' : 'default'}
          />
          <MetricRow
            label="Failed writes"
            value={failedWrites.toLocaleString()}
            tone={failedWrites > 0 ? 'danger' : 'default'}
          />
          <MetricRow
            label="Read availability"
            value={`${readAvailability}%`}
            tone="success"
          />
          <MetricRow
            label="Write availability"
            value={`${writeAvailability}%`}
            tone={writeAvailability === 0 ? 'danger' : 'success'}
          />
          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <AlertTriangle className="h-3 w-3" /> Stale-read risk
            </div>
            <p className="text-xs leading-relaxed text-text-secondary">
              At {replicationLag}ms lag, ~{staleChancePct}% of replica reads serve data older than{' '}
              {STALE_THRESHOLD_MS}ms. {isStaleLag ? (
                <span className="text-warning">Treat replica reads as eventually consistent.</span>
              ) : (
                <span className="text-success">Effectively fresh for most workloads.</span>
              )}
            </p>
          </div>
        </>
      }
      explanation={explanation}
      guidedScenario={guidedScenario}
      takeaway={
        <>
          Replication buys you <strong>read scale and availability</strong> at the cost of{' '}
          <strong>consistency</strong>. The lag number is not a metric — it is a contract: every
          read from a replica is a bet that the lag is small enough for your workload. Reads-after-writes
          must go to the primary. Everything else can fan out.
        </>
      }
      relatedConcepts={relatedConcepts}
      onReset={handleReset}
    />
  );
}

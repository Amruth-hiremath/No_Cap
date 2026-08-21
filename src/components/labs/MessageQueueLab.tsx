'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Layers,
  Users,
  Cpu,
  TrendingUp,
  Timer,
  AlertTriangle,
  Inbox,
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
const QUEUE_SOFT_LIMIT = 100; // amber threshold
const QUEUE_HARD_LIMIT = 500;
const QUEUE_MAX_TRACKED = 5000; // red threshold (overflow)

const DEFAULTS = {
  producerRate: 30,
  consumerCount: 3,
  processingRate: 15,
};

type QueueTone = 'green' | 'amber' | 'red';

function queueTone(depth: number, growth: number): QueueTone {
  if (depth > QUEUE_HARD_LIMIT) return 'red';
  if (depth > QUEUE_SOFT_LIMIT || (growth > 0 && depth > 0)) return 'amber';
  return 'green';
}

const toneBar: Record<QueueTone, string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-danger',
};
const toneText: Record<QueueTone, string> = {
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-danger',
};

export function MessageQueueLab() {
  const [producerRate, setProducerRate] = useState(DEFAULTS.producerRate);
  const [consumerCount, setConsumerCount] = useState(DEFAULTS.consumerCount);
  const [processingRate, setProcessingRate] = useState(DEFAULTS.processingRate);

  const [queueDepth, setQueueDepth] = useState(0);
  const [totalProduced, setTotalProduced] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [tickProduced, setTickProduced] = useState(0);
  const [tickProcessed, setTickProcessed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [peakDepth, setPeakDepth] = useState(0);

  const depthRef = useRef(queueDepth);
  useEffect(() => {
    depthRef.current = queueDepth;
  }, [queueDepth]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const produced = producerRate;
      const capacity = consumerCount * processingRate;
      const available = depthRef.current + produced;
      const processed = Math.min(available, capacity);
      const newDepth = Math.min(QUEUE_MAX_TRACKED, available - processed);

      setTickProduced(produced);
      setTickProcessed(processed);
      setQueueDepth(newDepth);
      setTotalProduced((p) => p + produced);
      setTotalProcessed((p) => p + processed);
      setPeakDepth((p) => Math.max(p, newDepth));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [producerRate, consumerCount, processingRate, paused]);

  const capacity = consumerCount * processingRate;
  const backlog = tickProduced - tickProcessed;
  const tone = queueTone(queueDepth, backlog);
  const delaySecs = capacity > 0 ? Math.min(999, queueDepth / capacity) : queueDepth > 0 ? 999 : 0;
  const utilPct = capacity > 0 ? Math.min(100, Math.round((tickProcessed / capacity) * 100)) : 0;

  function handleReset() {
    setProducerRate(DEFAULTS.producerRate);
    setConsumerCount(DEFAULTS.consumerCount);
    setProcessingRate(DEFAULTS.processingRate);
    setQueueDepth(0);
    setTotalProduced(0);
    setTotalProcessed(0);
    setTickProduced(0);
    setTickProcessed(0);
    setPeakDepth(0);
    setPaused(false);
  }

  const explanation = useMemo(() => {
    if (queueDepth === 0 && tickProduced <= tickProcessed) {
      return (
        <>
          Producers add {tickProduced} msg/s; consumers drain {tickProcessed} msg/s. The queue is
          empty — consumers keep up with producers in real time. No backlog, no delay.
        </>
      );
    }
    if (backlog > 0 && queueDepth <= QUEUE_SOFT_LIMIT) {
      return (
        <>
          Producers add {tickProduced} msg/s but consumers only drain {tickProcessed} msg/s —
          that&apos;s <strong className="text-warning">+{backlog} msg/s of backlog</strong>. The
          queue depth is creeping up. Latency for new messages is now ~{delaySecs.toFixed(1)}s
          because they have to wait behind everything already in the queue.
        </>
      );
    }
    if (queueDepth > QUEUE_HARD_LIMIT) {
      return (
        <>
          The queue is <strong className="text-danger">overflowing</strong> at {Math.round(queueDepth)}
          {' '}messages deep. Producers outpace consumers by {backlog} msg/s. Memory is growing,
          latency is unbounded, and you are one OOM away from data loss. Either add consumers,
          speed up processing, or shed load with back-pressure.
        </>
      );
    }
    return (
      <>
        Queue depth is {Math.round(queueDepth)} messages. Consumers are processing at {tickProcessed}/s of
        a {capacity}/s capacity. Processing delay ≈ {Number.isFinite(delaySecs) ? `${delaySecs.toFixed(1)}s` : '∞'}.
      </>
    );
  }, [queueDepth, tickProduced, tickProcessed, capacity, backlog, delaySecs]);

  const guidedScenario: GuidedScenario = {
    title: 'Find the breaking point',
    description:
      'Producers just doubled their rate. Slide the producer rate up until the queue turns red, then add consumers until it stabilizes. This is the exact same trade-off real teams negotiate every day.',
    action: {
      label: 'Double producer rate',
      onClick: () => setProducerRate((r) => Math.min(100, r * 2)),
    },
    question:
      'You can either add 2 more consumers at 15 msg/s each, or rewrite the consumer to be twice as fast. Which is cheaper to operate? Which is faster to deploy?',
  };

  const relatedConcepts: RelatedConcept[] = [
    { slug: 'message-queues', title: 'Message Queues' },
    { slug: 'competing-consumers', title: 'Competing Consumers' },
    { slug: 'back-pressure', title: 'Back-Pressure' },
    { slug: 'queue-based-load-leveling', title: 'Queue-Based Load Leveling' },
  ];

  // Visual bar fill — capped at hard limit, but show overflow indicator if higher.
  const barPct = Math.min(100, (queueDepth / QUEUE_HARD_LIMIT) * 100);

  return (
    <LabFramework
      eyebrow="Lab 03 · Message Queue"
      title="Decouple producers from consumers"
      subtitle="Producers push. Consumers pull. The queue absorbs the mismatch — until it doesn't."
      problem={
        <>
          A web request handler that synchronously sends 100 welcome emails will block the user for
          as long as the slowest mail server takes. A <strong>message queue</strong> breaks that
          coupling: producers drop messages onto a queue in microseconds; consumers pull them off
          at their own pace. The queue absorbs bursts. The catch: if producers outpace consumers
          for too long, the queue grows unbounded — memory fills, latency climbs, and the system
          stops being &quot;eventually consistent&quot; and starts being{' '}
          <em>eventually broken</em>.
        </>
      }
      canvas={
        <div className="space-y-4">
          {/* Pipeline */}
          <div className="grid grid-cols-[1fr_1.4fr_1fr] items-stretch gap-2">
            {/* Producers */}
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-inset p-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                <Users className="h-3 w-3" /> Producers
              </div>
              <div className="tnum text-sm font-semibold text-text-primary">
                {producerRate}
                <span className="ml-1 text-[10px] text-text-muted">msg/s</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from({ length: Math.min(3, Math.ceil(producerRate / 20)) }).map((_, i) => (
                  <span
                    key={i}
                    className="lab-dot-down h-1.5 w-1.5 rounded-full bg-accent"
                    style={
                      {
                        '--lab-flow-distance': '20px',
                        '--lab-flow-duration': '900ms',
                        animationDelay: `${i * 200}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            </div>

            {/* Queue */}
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  <Inbox className="h-3 w-3" /> Queue
                </div>
                <span className={cn('tnum text-xs font-semibold', toneText[tone])}>
                  {Math.round(queueDepth)} deep
                </span>
              </div>
              <div className="relative h-8 w-full overflow-hidden rounded bg-surface-subtle">
                <div
                  className={cn('lab-bar absolute bottom-0 left-0 right-0', toneBar[tone])}
                  style={{ height: `${barPct}%` }}
                />
                {queueDepth > QUEUE_HARD_LIMIT && (
                  <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-danger px-1 py-0.5 text-[9px] font-semibold text-text-inverse">
                    <AlertTriangle className="h-2.5 w-2.5" /> OVERFLOW
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-text-faint">
                <span>0</span>
                <span>limit {QUEUE_HARD_LIMIT}</span>
              </div>
            </div>

            {/* Consumers */}
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-inset p-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                <Cpu className="h-3 w-3" /> Consumers
              </div>
              <div className="tnum text-sm font-semibold text-text-primary">
                {tickProcessed}
                <span className="ml-1 text-[10px] text-text-muted">msg/s</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from({ length: Math.min(consumerCount, 6) }).map((_, i) => (
                  <span
                    key={i}
                    className="lab-dot-pop h-1.5 w-1.5 rounded-full bg-success"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
                {consumerCount > 6 && (
                  <span className="text-[10px] text-text-muted">+{consumerCount - 6}</span>
                )}
              </div>
            </div>
          </div>

          {/* Capacity strip */}
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-inset p-2 text-[11px]">
            <span className="flex items-center gap-1 text-text-muted">
              <Layers className="h-3 w-3" /> Capacity
            </span>
            <span className="tnum font-semibold text-text-secondary">
              {consumerCount} × {processingRate} = {capacity} msg/s
            </span>
            <ArrowRight className="h-3 w-3 text-text-faint" />
            <span className={cn('tnum font-semibold', toneText[tone])}>{utilPct}% used</span>
          </div>

          <p className="text-[10px] text-text-faint">
            Amber at depth {QUEUE_SOFT_LIMIT}+, red at {QUEUE_HARD_LIMIT}+. Pause to inspect.
          </p>
        </div>
      }
      controls={
        <>
          <SliderControl
            label="Producer rate"
            value={producerRate}
            min={1}
            max={100}
            unit=" msg/s"
            onChange={setProducerRate}
          />
          <SliderControl
            label="Consumer count"
            value={consumerCount}
            min={1}
            max={10}
            onChange={setConsumerCount}
          />
          <SliderControl
            label="Processing rate per consumer"
            value={processingRate}
            min={1}
            max={50}
            unit=" msg/s"
            onChange={setProcessingRate}
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
            label="Queue depth"
            value={Math.round(queueDepth).toLocaleString()}
            hint={`peak ${Math.round(peakDepth)}`}
            tone={tone === 'red' ? 'danger' : tone === 'amber' ? 'warning' : 'success'}
          />
          <MetricRow
            label="Throughput"
            value={`${tickProcessed} msg/s`}
            hint={`of ${capacity} capacity`}
            tone="accent"
          />
          <MetricRow
            label="Backlog growth"
            value={`${backlog >= 0 ? '+' : ''}${backlog} msg/s`}
            tone={backlog > 0 ? 'danger' : 'success'}
          />
          <MetricRow
            label="Processing delay"
            value={
              !Number.isFinite(delaySecs) ? '∞' : `${delaySecs.toFixed(1)}s`
            }
            tone={delaySecs > 5 ? 'danger' : delaySecs > 1 ? 'warning' : 'success'}
          />
          <MetricRow label="Total produced" value={totalProduced.toLocaleString()} />
          <MetricRow label="Total processed" value={totalProcessed.toLocaleString()} />
          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <Timer className="h-3 w-3" /> Status
            </div>
            <div
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium',
                tone === 'green'
                  ? 'bg-success-soft text-success'
                  : tone === 'amber'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-danger-soft text-danger'
              )}
            >
              {tone === 'green'
                ? 'Stable — consumers keep up with producers.'
                : tone === 'amber'
                  ? 'Growing — backlog is accumulating.'
                  : 'Overflowing — queue is unbounded.'}
            </div>
          </div>
        </>
      }
      explanation={explanation}
      guidedScenario={guidedScenario}
      takeaway={
        <>
          A queue doesn&apos;t make a slow consumer faster — it makes the{' '}
          <strong>slowness tolerable</strong> by absorbing bursts. But every message that waits in
          the queue is latency a user will eventually pay. The queue is stable only when{' '}
          <em>long-run producer rate ≤ long-run consumer capacity</em>. Everything else is just how
          long the buffer buys you.
        </>
      }
      relatedConcepts={relatedConcepts}
      onReset={handleReset}
    />
  );
}

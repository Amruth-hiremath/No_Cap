import Link from 'next/link';
import { FlaskConical, ArrowRight, Activity, HardDrive, Inbox, Database, ShieldCheck } from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge } from '@/components/ui/Badge';

interface LabMeta {
  slug: string;
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  topic: string;
  est: string;
}

const LABS: LabMeta[] = [
  {
    slug: 'load-balancer',
    number: '01',
    title: 'Load Balancer',
    description:
      'Distribute traffic across a pool of servers. Round-robin, least-connections, and random — watch how each algorithm handles a failed node and a traffic spike.',
    icon: Activity,
    topic: 'Scaling',
    est: '5 min',
  },
  {
    slug: 'caching',
    number: '02',
    title: 'Caching',
    description:
      'Absorb reads before they hit the database. Tune hit rate, TTL, and availability — and watch what happens when the cache disappears.',
    icon: HardDrive,
    topic: 'Performance',
    est: '5 min',
  },
  {
    slug: 'message-queue',
    number: '03',
    title: 'Message Queue',
    description:
      'Decouple producers from consumers. Find the breaking point where a stable queue tips into an overflowing backlog.',
    icon: Inbox,
    topic: 'Async',
    est: '6 min',
  },
  {
    slug: 'replication',
    number: '04',
    title: 'Replication',
    description:
      'Survive a primary failure. See how read/write split and replication lag affect stale reads, availability, and failover.',
    icon: Database,
    topic: 'Reliability',
    est: '6 min',
  },
  {
    slug: 'rate-limiter',
    number: '05',
    title: 'Rate Limiter',
    description:
      'Protect a service from being overwhelmed. Compare token-bucket, leaky-bucket, and fixed-window under a real traffic spike.',
    icon: ShieldCheck,
    topic: 'Protection',
    est: '5 min',
  },
];

export const metadata = {
  title: 'Labs — NO CAP',
  description:
    'Interactive system-design labs. Tune the dials, break the system, watch it recover.',
};

export default function LabsIndexPage() {
  return (
    <div className="space-y-8 pb-4">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          <FlaskConical className="h-3.5 w-3.5" />
          Labs
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          Break it. Watch it. Learn it.
        </h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Five interactive simulations. Tune the dials, trigger failures, and watch the
          trade-offs play out in real time. No setup, no terminal — just you and the system.
        </p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {LABS.map((lab) => {
          const Icon = lab.icon;
          return (
            <li key={lab.slug}>
              <Link href={`/labs/${lab.slug}`} className="block h-full">
                <Surface
                  variant="solid"
                  className="group flex h-full flex-col gap-3 p-5 transition-all hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Lab {lab.number}
                        </div>
                        <h2 className="text-lg font-semibold text-text-primary">{lab.title}</h2>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-text-faint transition-colors group-hover:text-accent" />
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-text-secondary">
                    {lab.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{lab.topic}</Badge>
                    <Badge variant="default">~{lab.est}</Badge>
                  </div>
                </Surface>
              </Link>
            </li>
          );
        })}
      </ul>

      <Surface variant="frosted" className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          <FlaskConical className="h-3.5 w-3.5" /> How labs work
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Each lab is a deterministic, client-side simulation — no backend, no API calls.
          Move the sliders, tap servers, fail primaries. Every change updates the live
          visualization within a second. Use the &quot;Try this&quot; prompt at the bottom
          of each lab to walk through a specific scenario, then read the &quot;Key
          takeaway&quot; for the mental model that ties it together.
        </p>
      </Surface>
    </div>
  );
}

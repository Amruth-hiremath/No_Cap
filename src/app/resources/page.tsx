import Link from 'next/link';
import { ExternalLink, BookOpen, Video, Globe2, ShieldCheck, Gauge, Boxes } from 'lucide-react';
import { AccentRule } from '@/components/ui/AccentRule';
import { Surface } from '@/components/ui/Surface';

const groups = [
  {
    title: 'Core curriculum references', icon: BookOpen,
    items: [
      ['System Design Primer', 'Open-source system-design topics, trade-offs, interview questions, diagrams and exercises.', 'https://github.com/donnemartin/system-design-primer'],
      ['ByteByteGo', 'Progressive architecture walkthroughs that evolve from a simple server toward large-scale systems.', 'https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users'],
      ['GeeksforGeeks — System Design', 'Broad system-design reference covering databases, caching, protocols, scalability and interview design.', 'https://www.geeksforgeeks.org/system-design/system-design-tutorial/'],
      ['roadmap.sh — System Design', 'A structured roadmap for sequencing the concepts in this curriculum.', 'https://roadmap.sh/system-design'],
    ],
  },
  {
    title: 'Primary technical references', icon: Globe2,
    items: [
      ['IETF RFC Editor', 'Protocol specifications and standards for HTTP, TCP, TLS and related networking primitives.', 'https://www.rfc-editor.org/'],
      ['Cloudflare Learning Center', 'Practical explainers on DNS, CDNs, networking, security and edge architecture.', 'https://www.cloudflare.com/learning/'],
      ['AWS Architecture Center', 'Reference architectures, cloud patterns and production design guidance.', 'https://aws.amazon.com/architecture/'],
      ['Google SRE Book', 'Reliability, monitoring, capacity, incident response and production engineering fundamentals.', 'https://sre.google/sre-book/table-of-contents/'],
      ['Azure Architecture Center', 'Cloud architecture patterns, trade-offs and reference designs.', 'https://learn.microsoft.com/en-us/azure/architecture/'],
    ],
  },
  {
    title: 'Reliability & production', icon: ShieldCheck,
    items: [
      ['Google SRE — Testing for Reliability', 'Practical reliability testing and production engineering guidance.', 'https://sre.google/resources/book-update/testing-for-reliability/'],
      ['Cloudflare — DDoS Learning', 'Understanding denial-of-service threats and layered mitigations.', 'https://www.cloudflare.com/learning/ddos/what-is-a-ddos-attack/'],
      ['AWS Well-Architected', 'Reliability, security, performance efficiency and cost trade-offs in production systems.', 'https://aws.amazon.com/architecture/well-architected/'],
    ],
  },
  {
    title: 'Performance & architecture', icon: Gauge,
    items: [
      ['ByteByteGo — Scaling Websites', 'A step-by-step evolution from a single server to load-balanced, cached and partitioned architectures.', 'https://bytebytego.com/guides/how-to-scale-a-website-to-support-millions-of-users/'],
      ['ByteByteGo — From 0 to Millions', 'A progressive guide to when and why caches, queues, clusters and service decomposition are introduced.', 'https://blog.bytebytego.com/p/from-0-to-millions-a-guide-to-scaling'],
      ['System Design Primer — Latency Numbers', 'Quick reference material for reasoning about latency and system bottlenecks.', 'https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know'],
    ],
  },
  {
    title: 'Video learning', icon: Video,
    items: [
      ['Scalability Lecture — Harvard', 'A classic lecture on scaling, caching, load balancing, replication and partitioning.', 'https://www.youtube.com/watch?v=-W9F__D3oY4'],
      ['CAP Theorem — explanation', 'A visual introduction to consistency, availability and partitions.', 'https://www.youtube.com/watch?v=k-Yaq8AHlFA'],
    ],
  },
];

export default function ResourcesPage() {
  return (
    <div className="animate-page-enter space-y-8">
      <header>
        <div className="flex items-center gap-2 text-accent"><Boxes className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-[0.14em]">External shelf</span></div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Resources</h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">NO CAP keeps the core curriculum self-contained. This shelf gives you reputable references for alternate explanations, standards, production engineering and deeper case studies.</p>
      </header>

      <div className="space-y-8">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.title} className="space-y-3">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-accent" /><h2 className="text-lg font-semibold text-text-primary">{group.title}</h2></div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map(([title, description, url]) => (
                  <Surface key={url} variant="solid" className="group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-text-primary">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
                      </div>
                      <Link href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title}`} className="shrink-0 rounded-md p-2 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </Surface>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

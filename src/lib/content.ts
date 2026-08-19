/* ═══════════════════════════════════════════════════════════════════
   NO CAP content loader — registry-based, no hardcoded imports.
   Auto-generated. Do not edit manually.
   ═══════════════════════════════════════════════════════════════════ */

import type { Concept, Track, GlossaryEntry, CurriculumSection } from './types';
import tracksData from '@content/tracks.json';
import glossaryData from '@content/glossary.json';
import curriculumData from '@content/curriculum.json';
import manifest from '@content/concepts/manifest.json';


import _c0 from '@content/concepts/what-is-system-design.json';
import _c1 from '@content/concepts/how-to-approach-system-design.json';
import _c2 from '@content/concepts/performance-vs-scalability.json';
import _c3 from '@content/concepts/latency-vs-throughput.json';
import _c4 from '@content/concepts/availability-vs-consistency.json';
import _c5 from '@content/concepts/cap-theorem.json';
import _c6 from '@content/concepts/consistency-patterns.json';
import _c7 from '@content/concepts/availability-patterns.json';
import _c8 from '@content/concepts/how-the-internet-works.json';
import _c9 from '@content/concepts/dns.json';
import _c10 from '@content/concepts/cdn.json';
import _c11 from '@content/concepts/load-balancers.json';
import _c12 from '@content/concepts/application-layer.json';
import _c13 from '@content/concepts/microservices.json';
import _c14 from '@content/concepts/service-discovery.json';
import _c15 from '@content/concepts/background-jobs.json';
import _c16 from '@content/concepts/http.json';
import _c17 from '@content/concepts/tcp.json';
import _c18 from '@content/concepts/udp.json';
import _c19 from '@content/concepts/rest.json';
import _c20 from '@content/concepts/graphql.json';
import _c21 from '@content/concepts/rpc.json';
import _c22 from '@content/concepts/grpc.json';
import _c23 from '@content/concepts/websockets.json';
import _c24 from '@content/concepts/server-sent-events.json';
import _c25 from '@content/concepts/webrtc.json';
import _c26 from '@content/concepts/tls.json';
import _c27 from '@content/concepts/quic.json';
import _c28 from '@content/concepts/sql-vs-nosql.json';
import _c29 from '@content/concepts/key-value-stores.json';
import _c30 from '@content/concepts/document-stores.json';
import _c31 from '@content/concepts/wide-column-stores.json';
import _c32 from '@content/concepts/graph-databases.json';
import _c33 from '@content/concepts/replication.json';
import _c34 from '@content/concepts/sharding.json';
import _c35 from '@content/concepts/federation.json';
import _c36 from '@content/concepts/denormalization.json';
import _c37 from '@content/concepts/sql-tuning.json';
import _c38 from '@content/concepts/transactions.json';
import _c39 from '@content/concepts/isolation-levels.json';
import _c40 from '@content/concepts/mvcc.json';
import _c41 from '@content/concepts/wal.json';
import _c42 from '@content/concepts/horizontal-scaling.json';
import _c43 from '@content/concepts/vertical-scaling.json';
import _c44 from '@content/concepts/back-pressure.json';
import _c45 from '@content/concepts/task-queues.json';
import _c46 from '@content/concepts/message-queues.json';
import _c47 from '@content/concepts/idempotent-operations.json';
import _c48 from '@content/concepts/consistent-hashing.json';
import _c49 from '@content/concepts/rate-limiting.json';
import _c50 from '@content/concepts/caching-strategies.json';
import _c51 from '@content/concepts/cache-aside.json';
import _c52 from '@content/concepts/write-through.json';
import _c53 from '@content/concepts/write-behind.json';
import _c54 from '@content/concepts/refresh-ahead.json';
import _c55 from '@content/concepts/client-caching.json';
import _c56 from '@content/concepts/cdn-caching.json';
import _c57 from '@content/concepts/web-server-caching.json';
import _c58 from '@content/concepts/database-caching.json';
import _c59 from '@content/concepts/application-caching.json';
import _c60 from '@content/concepts/message-queues-async.json';
import _c61 from '@content/concepts/event-driven-architecture.json';
import _c62 from '@content/concepts/pub-sub.json';
import _c63 from '@content/concepts/competing-consumers.json';
import _c64 from '@content/concepts/async-request-reply.json';
import _c65 from '@content/concepts/distributed-systems-intro.json';
import _c66 from '@content/concepts/consensus.json';
import _c67 from '@content/concepts/leader-election.json';
import _c68 from '@content/concepts/quorum.json';
import _c69 from '@content/concepts/logical-clocks.json';
import _c70 from '@content/concepts/distributed-locks.json';
import _c71 from '@content/concepts/distributed-transactions.json';
import _c72 from '@content/concepts/two-phase-commit.json';
import _c73 from '@content/concepts/saga-pattern.json';
import _c74 from '@content/concepts/retry.json';
import _c75 from '@content/concepts/circuit-breaker.json';
import _c76 from '@content/concepts/bulkhead.json';
import _c77 from '@content/concepts/throttling.json';
import _c78 from '@content/concepts/timeout.json';
import _c79 from '@content/concepts/graceful-degradation.json';
import _c80 from '@content/concepts/failover.json';
import _c81 from '@content/concepts/disaster-recovery.json';
import _c82 from '@content/concepts/multi-region.json';
import _c83 from '@content/concepts/compensating-transaction.json';
import _c84 from '@content/concepts/metrics-logs-traces.json';
import _c85 from '@content/concepts/slo-sla-sli.json';
import _c86 from '@content/concepts/health-monitoring.json';
import _c87 from '@content/concepts/availability-monitoring.json';
import _c88 from '@content/concepts/performance-monitoring.json';
import _c89 from '@content/concepts/instrumentation.json';
import _c90 from '@content/concepts/alerts-visualization.json';
import _c91 from '@content/concepts/strangler-fig.json';
import _c92 from '@content/concepts/sidecar.json';
import _c93 from '@content/concepts/cqrs.json';
import _c94 from '@content/concepts/pipes-and-filters.json';
import _c95 from '@content/concepts/api-gateway.json';
import _c96 from '@content/concepts/reverse-proxy.json';
import _c97 from '@content/concepts/external-config-store.json';
import _c98 from '@content/concepts/anti-corruption-layer.json';
import _c99 from '@content/concepts/service-mesh.json';
import _c100 from '@content/concepts/valet-key.json';
import _c101 from '@content/concepts/materialized-view.json';
import _c102 from '@content/concepts/index-table.json';
import _c103 from '@content/concepts/event-sourcing.json';
import _c104 from '@content/concepts/claim-check.json';
import _c105 from '@content/concepts/sequential-convoy.json';
import _c106 from '@content/concepts/priority-queue.json';
import _c107 from '@content/concepts/queue-based-load-leveling.json';
import _c108 from '@content/concepts/deployment-stamps.json';
import _c109 from '@content/concepts/geodes.json';
import _c110 from '@content/concepts/object-storage.json';
import _c111 from '@content/concepts/authentication.json';
import _c112 from '@content/concepts/authorization.json';
import _c113 from '@content/concepts/oauth.json';
import _c114 from '@content/concepts/federated-identity.json';
import _c115 from '@content/concepts/gatekeeper.json';
import _c116 from '@content/concepts/real-time-overview.json';
import _c117 from '@content/concepts/capacity-estimation.json';
import _c118 from '@content/concepts/qps-estimation.json';
import _c119 from '@content/concepts/storage-estimation.json';
import _c120 from '@content/concepts/bandwidth-estimation.json';
import _c121 from '@content/concepts/cache-sizing.json';
import _c122 from '@content/concepts/api-design.json';
import _c123 from '@content/concepts/data-modeling.json';
import _c124 from '@content/concepts/failure-analysis.json';
import _c125 from '@content/concepts/single-points-of-failure.json';
import _c126 from '@content/concepts/bottleneck-identification.json';
import _c127 from '@content/concepts/design-url-shortener.json';
import _c128 from '@content/concepts/design-key-value-store.json';
import _c129 from '@content/concepts/design-rate-limiter.json';
import _c130 from '@content/concepts/design-instagram.json';
import _c131 from '@content/concepts/design-twitter.json';
import _c132 from '@content/concepts/design-news-feed.json';
import _c133 from '@content/concepts/design-whatsapp.json';
import _c134 from '@content/concepts/design-chat-system.json';
import _c135 from '@content/concepts/design-uber.json';
import _c136 from '@content/concepts/design-netflix.json';
import _c137 from '@content/concepts/design-youtube.json';
import _c138 from '@content/concepts/design-notification-system.json';
import _c139 from '@content/concepts/design-file-storage.json';
import _c140 from '@content/concepts/design-search-system.json';
import _c141 from '@content/concepts/design-ride-matching.json';
import _c142 from '@content/concepts/design-hotel-reservation.json';
import _c143 from '@content/concepts/design-video-streaming.json';

const _all: Record<string, unknown> = {
  'what-is-system-design': _c0,
  'how-to-approach-system-design': _c1,
  'performance-vs-scalability': _c2,
  'latency-vs-throughput': _c3,
  'availability-vs-consistency': _c4,
  'cap-theorem': _c5,
  'consistency-patterns': _c6,
  'availability-patterns': _c7,
  'how-the-internet-works': _c8,
  'dns': _c9,
  'cdn': _c10,
  'load-balancers': _c11,
  'application-layer': _c12,
  'microservices': _c13,
  'service-discovery': _c14,
  'background-jobs': _c15,
  'http': _c16,
  'tcp': _c17,
  'udp': _c18,
  'rest': _c19,
  'graphql': _c20,
  'rpc': _c21,
  'grpc': _c22,
  'websockets': _c23,
  'server-sent-events': _c24,
  'webrtc': _c25,
  'tls': _c26,
  'quic': _c27,
  'sql-vs-nosql': _c28,
  'key-value-stores': _c29,
  'document-stores': _c30,
  'wide-column-stores': _c31,
  'graph-databases': _c32,
  'replication': _c33,
  'sharding': _c34,
  'federation': _c35,
  'denormalization': _c36,
  'sql-tuning': _c37,
  'transactions': _c38,
  'isolation-levels': _c39,
  'mvcc': _c40,
  'wal': _c41,
  'horizontal-scaling': _c42,
  'vertical-scaling': _c43,
  'back-pressure': _c44,
  'task-queues': _c45,
  'message-queues': _c46,
  'idempotent-operations': _c47,
  'consistent-hashing': _c48,
  'rate-limiting': _c49,
  'caching-strategies': _c50,
  'cache-aside': _c51,
  'write-through': _c52,
  'write-behind': _c53,
  'refresh-ahead': _c54,
  'client-caching': _c55,
  'cdn-caching': _c56,
  'web-server-caching': _c57,
  'database-caching': _c58,
  'application-caching': _c59,
  'message-queues-async': _c60,
  'event-driven-architecture': _c61,
  'pub-sub': _c62,
  'competing-consumers': _c63,
  'async-request-reply': _c64,
  'distributed-systems-intro': _c65,
  'consensus': _c66,
  'leader-election': _c67,
  'quorum': _c68,
  'logical-clocks': _c69,
  'distributed-locks': _c70,
  'distributed-transactions': _c71,
  'two-phase-commit': _c72,
  'saga-pattern': _c73,
  'retry': _c74,
  'circuit-breaker': _c75,
  'bulkhead': _c76,
  'throttling': _c77,
  'timeout': _c78,
  'graceful-degradation': _c79,
  'failover': _c80,
  'disaster-recovery': _c81,
  'multi-region': _c82,
  'compensating-transaction': _c83,
  'metrics-logs-traces': _c84,
  'slo-sla-sli': _c85,
  'health-monitoring': _c86,
  'availability-monitoring': _c87,
  'performance-monitoring': _c88,
  'instrumentation': _c89,
  'alerts-visualization': _c90,
  'strangler-fig': _c91,
  'sidecar': _c92,
  'cqrs': _c93,
  'pipes-and-filters': _c94,
  'api-gateway': _c95,
  'reverse-proxy': _c96,
  'external-config-store': _c97,
  'anti-corruption-layer': _c98,
  'service-mesh': _c99,
  'valet-key': _c100,
  'materialized-view': _c101,
  'index-table': _c102,
  'event-sourcing': _c103,
  'claim-check': _c104,
  'sequential-convoy': _c105,
  'priority-queue': _c106,
  'queue-based-load-leveling': _c107,
  'deployment-stamps': _c108,
  'geodes': _c109,
  'object-storage': _c110,
  'authentication': _c111,
  'authorization': _c112,
  'oauth': _c113,
  'federated-identity': _c114,
  'gatekeeper': _c115,
  'real-time-overview': _c116,
  'capacity-estimation': _c117,
  'qps-estimation': _c118,
  'storage-estimation': _c119,
  'bandwidth-estimation': _c120,
  'cache-sizing': _c121,
  'api-design': _c122,
  'data-modeling': _c123,
  'failure-analysis': _c124,
  'single-points-of-failure': _c125,
  'bottleneck-identification': _c126,
  'design-url-shortener': _c127,
  'design-key-value-store': _c128,
  'design-rate-limiter': _c129,
  'design-instagram': _c130,
  'design-twitter': _c131,
  'design-news-feed': _c132,
  'design-whatsapp': _c133,
  'design-chat-system': _c134,
  'design-uber': _c135,
  'design-netflix': _c136,
  'design-youtube': _c137,
  'design-notification-system': _c138,
  'design-file-storage': _c139,
  'design-search-system': _c140,
  'design-ride-matching': _c141,
  'design-hotel-reservation': _c142,
  'design-video-streaming': _c143,
};

const conceptMap: Record<string, Concept> = {};
for (const slug of manifest as string[]) {
  const mod = _all[slug];
  if (mod) conceptMap[slug] = mod as unknown as Concept;
}

export const CONCEPT_SLUGS: string[] = manifest as string[];

export function getAllConcepts(): Concept[] {
  return CONCEPT_SLUGS.map((s) => conceptMap[s]).filter(Boolean);
}

export function getPublishedConcepts(): Concept[] {
  return getAllConcepts().filter((c) => c.status === 'published');
}

export function getDraftConcepts(): Concept[] {
  return getAllConcepts().filter((c) => c.status === 'draft');
}

export function calculateReadingMinutes(concept: Concept): number {
  const text = [
    concept.summary,
    concept.why_it_matters,
    ...concept.blocks.map((b) => JSON.stringify(b.payload ?? '')),
    ...(concept.interview_prompts ?? []),
    ...(concept.common_mistakes ?? []),
  ].join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const interactive = concept.blocks.filter((b) => ['quiz', 'scenario', 'simulation', 'mermaid', 'image', 'video'].includes(b.type)).length;
  return Math.max(4, Math.min(20, Math.round(words / 190 + interactive * 0.3)));
}

export function getConcept(slug: string): Concept | null {
  return conceptMap[slug] ?? null;
}

export function getConceptsByArea(area: string): Concept[] {
  return getAllConcepts().filter((c) => c.area === area);
}

export function getConceptsByPhase(phase: string): Concept[] {
  return getAllConcepts().filter((c) => c.phase === phase);
}

export function getTracks(): Track[] {
  return tracksData as Track[];
}

export function getTrack(slug: string): Track | null {
  return (tracksData as Track[]).find((t) => t.slug === slug) ?? null;
}

export function getPhases() {
  return getTracks()[0]?.phases ?? [];
}

export function getCurriculum(): CurriculumSection[] {
  return (curriculumData as { sections: CurriculumSection[] }).sections;
}

export function getGlossary(): GlossaryEntry[] {
  return glossaryData as GlossaryEntry[];
}

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.toLowerCase();
  return getGlossary().filter(
    (e) =>
      e.term.toLowerCase().includes(q) ||
      e.aliases.some((a) => a.toLowerCase().includes(q)) ||
      e.definition.toLowerCase().includes(q)
  );
}

export function searchConcepts(query: string): Concept[] {
  const q = query.toLowerCase();
  return getAllConcepts().filter((c) => {
    const summary = c.summary ?? '';
    return (
      c.title.toLowerCase().includes(q) ||
      c.area.toLowerCase().includes(q) ||
      c.phase.toLowerCase().includes(q) ||
      c.slug.includes(q) ||
      summary.toLowerCase().includes(q)
    );
  });
}

export interface SearchResult {
  type: 'concept' | 'glossary' | 'action';
  title: string;
  subtitle?: string;
  href?: string;
  group: string;
  status?: string;
}

export function universalSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const results: SearchResult[] = [];
  results.push(
    ...searchConcepts(query).map((c) => ({
      type: 'concept' as const,
      title: c.title,
      subtitle: `${c.area} · ${c.estimated_minutes} min`,
      href: `/concepts/${c.slug}`,
      group: 'Concepts',
      status: c.status,
    }))
  );
  results.push(
    ...searchGlossary(query).map((g) => ({
      type: 'glossary' as const,
      title: g.term,
      subtitle: g.definition,
      href: g.concept_slug ? `/concepts/${g.concept_slug}` : '/glossary',
      group: 'Glossary',
    }))
  );
  return results;
}

export function getPrerequisiteChain(slug: string): Concept[] {
  const seen = new Set<string>();
  const out: Concept[] = [];
  const visit = (s: string) => {
    if (seen.has(s)) return;
    seen.add(s);
    const c = getConcept(s);
    if (!c) return;
    for (const p of c.prerequisites) visit(p);
    if (s !== slug) out.push(c);
  };
  visit(slug);
  return out;
}

export function getDependents(slug: string): Concept[] {
  return getAllConcepts().filter((c) => c.prerequisites.includes(slug));
}

export function getNextRecommended(currentSlug?: string): Concept | null {
  const all = getAllConcepts();
  if (currentSlug) {
    const current = getConcept(currentSlug);
    if (current && current.related.length > 0) {
      const next = getConcept(current.related[0]);
      if (next) return next;
    }
  }
  for (const c of all) {
    if (c.status === 'published') {
      const prereqsMet = c.prerequisites.every((p) => getConcept(p) !== null);
      if (prereqsMet) return c;
    }
  }
  return all[0] ?? null;
}

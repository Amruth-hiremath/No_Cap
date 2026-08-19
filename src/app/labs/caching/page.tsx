import { CachingLab } from '@/components/labs/CachingLab';

export const metadata = {
  title: 'Lab 02 — Caching · NO CAP',
  description:
    'Interactive caching simulation. Watch the request pipeline flow through App → Cache → DB and feel the impact of hit rate, TTL, and cache availability.',
};

export default function CachingLabPage() {
  return <CachingLab />;
}

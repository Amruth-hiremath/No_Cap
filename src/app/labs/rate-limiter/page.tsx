import { RateLimiterLab } from '@/components/labs/RateLimiterLab';

export const metadata = {
  title: 'Lab 05 — Rate Limiter · NO CAP',
  description:
    'Interactive rate limiter simulation. Compare token-bucket, leaky-bucket, and fixed-window algorithms under a real traffic spike.',
};

export default function RateLimiterLabPage() {
  return <RateLimiterLab />;
}

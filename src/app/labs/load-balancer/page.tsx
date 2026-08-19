import { LoadBalancerLab } from '@/components/labs/LoadBalancerLab';

export const metadata = {
  title: 'Lab 01 — Load Balancer · NO CAP',
  description:
    'Interactive load balancer simulation. Tune traffic rate, server count, and algorithm; fail servers and watch the cluster route around them.',
};

export default function LoadBalancerLabPage() {
  return <LoadBalancerLab />;
}

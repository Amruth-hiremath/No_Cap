import { ReplicationLab } from '@/components/labs/ReplicationLab';

export const metadata = {
  title: 'Lab 04 — Replication · NO CAP',
  description:
    'Interactive replication simulation. Fail the primary, promote a replica, and see how read/write split and replication lag affect stale reads and availability.',
};

export default function ReplicationLabPage() {
  return <ReplicationLab />;
}

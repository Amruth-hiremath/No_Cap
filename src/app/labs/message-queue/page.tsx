import { MessageQueueLab } from '@/components/labs/MessageQueueLab';

export const metadata = {
  title: 'Lab 03 — Message Queue · NO CAP',
  description:
    'Interactive message queue simulation. Tune producer rate, consumer count, and processing speed — find the breaking point where the queue tips into overflow.',
};

export default function MessageQueueLabPage() {
  return <MessageQueueLab />;
}

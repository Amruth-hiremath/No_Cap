import { cn } from '@/lib/utils';
import type { MasteryState } from '@/lib/types';
import { MASTERY_STATE_META } from '@/lib/mastery';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClasses = {
  default: 'bg-surface-subtle text-text-secondary border-border',
  accent: 'bg-accent-soft text-accent border-accent/30',
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tracking-wide',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function MasteryBadge({ state, size = 'sm' }: { state: MasteryState; size?: 'sm' | 'md' }) {
  const meta = MASTERY_STATE_META[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        meta.bg,
        meta.text,
        'border-border',
        size === 'md' && 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

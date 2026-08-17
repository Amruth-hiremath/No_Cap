import { cn } from '@/lib/utils';

/**
 * AccentRule — a 2px amber rule used as a section anchor.
 * Reinforces visual hierarchy without gradient decoration.
 */
interface AccentRuleProps {
  width?: string;
  className?: string;
}

export function AccentRule({ width = 'w-16', className }: AccentRuleProps) {
  return (
    <div
      className={cn('h-[2px] bg-accent rounded-full', width, className)}
      aria-hidden
    />
  );
}

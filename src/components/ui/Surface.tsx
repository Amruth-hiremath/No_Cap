import { cn } from '@/lib/utils';

/**
 * Surface — solid card surface for dense content, lessons, reading.
 * Use `variant="liquid"` ONLY for the Today's Dose hero (max 1 per screen).
 * Use `variant="frosted"` sparingly for small supporting panels.
 */
interface SurfaceProps {
  children: React.ReactNode;
  variant?: 'solid' | 'liquid' | 'frosted' | 'inset' | 'bare';
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button' | 'section' | 'article';
}

const variantClass: Record<NonNullable<SurfaceProps['variant']>, string> = {
  solid: 'bg-surface border border-border',
  inset: 'bg-surface-inset border border-border',
  liquid: 'glass-liquid',
  frosted: 'glass-frosted',
  bare: '',
};

export function Surface({
  children,
  variant = 'solid',
  className,
  onClick,
  as = 'div',
}: SurfaceProps) {
  const Component = onClick ? 'button' : (as as React.ElementType);
  return (
    <Component
      onClick={onClick}
      className={cn(
        variantClass[variant],
        'rounded-xl text-left',
        onClick && 'cursor-pointer transition-all hover:border-border-strong',
        className
      )}
    >
      {children}
    </Component>
  );
}

/** Section header — eyebrow label + title pattern used throughout. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && (
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
            {icon}
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * EmptyState — designed empty states for review-done, no-progress, etc.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-accent">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

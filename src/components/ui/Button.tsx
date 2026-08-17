import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary:
    'bg-accent text-text-inverse hover:bg-accent-hover border border-accent shadow-sm',
  secondary:
    'bg-surface text-text-primary hover:bg-surface-subtle border border-border-strong',
  ghost:
    'text-text-secondary hover:bg-surface-subtle hover:text-text-primary border border-transparent',
  danger:
    'bg-danger text-text-inverse hover:bg-danger/90 border border-danger',
};

const sizeClasses = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
  md: 'text-sm px-3.5 py-2 rounded-lg gap-2',
  lg: 'text-[15px] px-5 py-2.5 rounded-lg gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-inherit',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

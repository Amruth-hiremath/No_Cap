import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'liquid' | 'frosted' | 'smoke' | 'dark' | 'solid';
  className?: string;
  onClick?: () => void;
  glow?: boolean;
  glowKind?: 'amber' | 'green';
}

const variantClass: Record<NonNullable<GlassCardProps['variant']>, string> = {
  liquid: 'glass-liquid',
  frosted: 'glass-frosted',
  smoke: 'glass-smoke',
  dark: 'glass-dark',
  solid: 'card-solid',
};

export function GlassCard({
  children,
  variant = 'frosted',
  className,
  onClick,
  glow = false,
  glowKind = 'amber',
}: GlassCardProps) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={cn(
        variantClass[variant],
        'rounded-xl p-5 text-left',
        glow && (glowKind === 'green' ? 'edge-glow-success' : 'edge-glow'),
        onClick && 'cursor-pointer transition-all hover:scale-[1.01]',
        className
      )}
    >
      {children}
    </Component>
  );
}

'use client';

import Image from 'next/image';
import { useStore } from '@/lib/store';
import { isDarkTheme } from '@/lib/themes';

type Props = {
  size?: 32 | 48 | 64 | 128 | 180 | 192 | 256 | 512;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({ size = 64, className = '', priority = false, alt = 'NO CAP' }: Props) {
  const theme = useStore((s) => s.theme);
  const dark = isDarkTheme(theme);
  const src = dark
    ? `/brand/no-cap-dark-${size}.png`
    : `/brand/no-cap-light-${size}.png`;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
      sizes={`${size}px`}
    />
  );
}

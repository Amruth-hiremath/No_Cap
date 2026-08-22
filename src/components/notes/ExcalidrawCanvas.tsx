'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import '@excalidraw/excalidraw/index.css';

type Props = {
  elements: readonly any[];
  onChange: (elements: readonly any[]) => void;
};

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((m) => m.Excalidraw),
  { ssr: false, loading: () => <div className="h-full grid place-items-center text-sm text-text-muted">Loading canvas…</div> },
);

export function ExcalidrawCanvas({ elements, onChange }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="notes-excalidraw-shell" aria-label="Infinite notes canvas">
      <Excalidraw
        initialData={{ elements } as any}
        onChange={(nextElements) => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(Array.from(nextElements)), 250);
        }}
      />
    </div>
  );
}

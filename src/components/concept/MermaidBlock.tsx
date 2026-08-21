'use client';

import { useEffect, useRef, useState, memo, useId } from 'react';
import { Maximize2, Copy, Check, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MermaidBlockProps {
  code: string;
  caption?: string;
  alt_text?: string;
}

function MermaidBlockInner({ code, caption, alt_text }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const reactId = useId();
  const mermaidId = `m${reactId.replace(/[^a-zA-Z0-9-]/g, '')}`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'strict',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          themeVariables: {
            primaryColor: '#f5ead7', primaryTextColor: '#251f18', primaryBorderColor: '#b98a49',
            lineColor: '#8f8068', secondaryColor: '#e8f0e8', tertiaryColor: '#f0ece4',
            fontSize: '14px',
          },
          flowchart: { useMaxWidth: false, htmlLabels: false, curve: 'linear', nodeSpacing: 46, rankSpacing: 54, padding: 12 },
          sequence: { useMaxWidth: false, diagramMarginX: 16, diagramMarginY: 12, actorMargin: 30, messageMargin: 24 },
        });
        let safeCode = code.replace(/<br\s*\/?>(?=\s*)/gi, ' ').trim();
        if (/^(flowchart|graph)\s+(TB|TD)\b/i.test(safeCode) && safeCode.split('\n').length > 10) {
          safeCode = safeCode.replace(/^(flowchart|graph)\s+(TB|TD)\b/i, '$1 LR');
        }
        const { svg: rendered } = await mermaid.render(mermaidId, safeCode);
        if (!cancelled) { setSvg(rendered); setError(null); }
      } catch (err) {
        if (!cancelled) { setSvg(null); setError(err instanceof Error ? err.message : 'Failed to render diagram'); }
      }
    })();
    return () => { cancelled = true; };
  }, [code, mounted, mermaidId]);

  const copySource = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  };

  if (!mounted) return <div className="my-4 rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">Loading diagram…</div>;
  if (error) return <div className="my-4 rounded-xl border border-warning bg-warning-soft p-4"><p className="text-sm text-warning">Diagram could not be rendered.</p><p className="mt-1 text-xs text-text-secondary">{alt_text}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold">View Mermaid source</summary><pre className="mt-2 overflow-auto rounded-lg bg-black/10 p-3 text-xs">{code}</pre></details></div>;

  return <figure className={cn('my-6 mermaid-figure', fullscreen && 'mermaid-figure--fullscreen')}>
    <div className="mermaid-toolbar">
      <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-text-faint">Diagram</div><div className="truncate text-xs text-text-secondary">{caption || 'System flow'}</div></div>
      <div className="flex items-center gap-1">
        <button className="mermaid-tool-btn" onClick={()=>setSourceOpen(v=>!v)} title="Show Mermaid source"><Code2 className="h-3.5 w-3.5" /></button>
        <button className="mermaid-tool-btn" onClick={copySource} title="Copy Mermaid source">{copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}</button>
        <button className="mermaid-tool-btn" onClick={()=>setFullscreen(v=>!v)} title={fullscreen?'Exit fullscreen':'Open fullscreen'}><Maximize2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
    {sourceOpen && <pre className="mermaid-source">{code}</pre>}
    <div ref={containerRef} className="nocap-mermaid-shell overflow-auto rounded-b-xl border border-t-0 border-border bg-surface px-4 py-5 min-h-[180px] max-h-[34rem]" aria-label={alt_text || caption || 'Diagram'} role="img" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
    {caption && <figcaption className="mt-2 text-center text-xs text-text-muted">{caption}</figcaption>}
  </figure>;
}

export const MermaidBlock = memo(MermaidBlockInner);

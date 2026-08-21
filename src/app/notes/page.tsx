'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Download, FileJson, FileText, PenTool, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { WorkspaceNotePicker } from '@/components/notes/WorkspaceNotePicker';
import { defaultNote } from '@/lib/note-defaults';

const BlockDocumentEditor = dynamic(() => import('@/components/notes/BlockDocumentEditor').then((m) => m.BlockDocumentEditor), { ssr: false, loading: () => <div className="notes-editor-loading"><div className="skeleton-line skeleton-line--wide" /><div className="skeleton-line" /><div className="skeleton-block" /><div className="skeleton-block" /></div> });
const ExcalidrawCanvas = dynamic(() => import('@/components/notes/ExcalidrawCanvas').then((m) => m.ExcalidrawCanvas), { ssr: false, loading: () => <div className="notes-editor-loading"><div className="unique-loader" aria-label="Loading canvas" /><div className="text-xs text-text-muted">Preparing your canvas…</div></div> });
import { useStore } from '@/lib/store';
import type { WorkspaceNote } from '@/lib/types';
import { useHydrated } from '@/lib/useHydrated';
import { cn } from '@/lib/utils';

export default function NotesWorkspacePage() {
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const notes = useStore((s) => s.workspace_notes);
  const create = useStore((s) => s.createWorkspaceNote);
  const update = useStore((s) => s.updateWorkspaceNote);
  const remove = useStore((s) => s.deleteWorkspaceNote);
  const [activeId, setActiveId] = useState(notes[0]?.id ?? '');
  const [tab, setTab] = useState<'document'|'canvas'>('document');
  const [query, setQuery] = useState('');
  const handledNewRef = useRef(false);

  useEffect(() => {
    if (!activeId && notes[0]) setActiveId(notes[0].id);
  }, [activeId, notes]);

  useEffect(() => {
    if (!hydrated || handledNewRef.current || searchParams.get('new') !== '1') return;
    handledNewRef.current = true;
    const next = defaultNote();
    create(next);
    setActiveId(next.id);
    window.history.replaceState({}, '', '/notes');
  }, [hydrated, searchParams, create]);

  const filtered = useMemo(() => notes.filter(n => !query.trim() || n.title.toLowerCase().includes(query.toLowerCase())), [notes, query]);
  const active = notes.find(n => n.id === activeId) ?? notes[0];

  const createNote = () => {
    const next = defaultNote();
    create(next);
    setActiveId(next.id);
    setTab('document');
  };

  const downloadFile = (name: string, body: string, mime: string) => {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const toMarkdown = (note: WorkspaceNote) => note.blocks.map((b) => {
    const text = b.content.replace(/<[^>]+>/g, '').trim();
    if (!text && b.type !== 'divider') return '';
    switch (b.type) {
      case 'heading1': return `# ${text}`;
      case 'heading2': return `## ${text}`;
      case 'bullet': return `- ${text}`;
      case 'numbered': return `1. ${text}`;
      case 'checklist': return `- [${b.checked ? 'x' : ' '}] ${text}`;
      case 'quote': return `> ${text}`;
      case 'code': return `\`\`\`${b.language || 'text'}\n${text}\n\`\`\``;
      case 'divider': return '---';
      case 'callout': return `> **${b.callout_tone || 'info'}:** ${text}`;
      default: return text;
    }
  }).filter(Boolean).join('\n\n');

  const duplicateNote = () => {
    if (!active) return;
    const clone: WorkspaceNote = { ...active, id: `wn_${Date.now().toString(36)}`, title: `${active.title || 'Untitled note'} copy`, blocks: active.blocks.map((b) => ({ ...b, id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}` })), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    create(clone);
    setActiveId(clone.id);
    setTab('document');
  };

  const deleteActive = () => {
    if (!active) return;
    if (!window.confirm(`Delete “${active.title || 'Untitled note'}”? This cannot be undone.`)) return;
    const next = notes.filter((n) => n.id !== active.id);
    remove(active.id);
    setActiveId(next[0]?.id ?? '');
  };


  if (!hydrated) return <div className="notes-workspace-loading">Loading your workspace…</div>;

  return (
    <div className="notes-workspace">
      <div className="notes-workspace__header">
        <div>
          <div className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Notebook</div>
          <h1>Notes</h1>
          <p>Think in structured blocks, then switch to an infinite canvas for architecture sketches.</p>
        </div>
        <div className="notes-header-actions">{active && <><button className="notes-secondary-btn" onClick={()=>downloadFile(`${active.title || 'note'}.md`, toMarkdown(active), 'text/markdown')}><Download className="h-3.5 w-3.5"/> Export MD</button><button className="notes-secondary-btn" onClick={()=>downloadFile(`${active.title || 'note'}.json`, JSON.stringify(active,null,2), 'application/json')}><FileJson className="h-3.5 w-3.5"/> Export JSON</button><button className="notes-secondary-btn" onClick={duplicateNote}><Copy className="h-3.5 w-3.5"/> Duplicate</button><button className="notes-danger-btn" onClick={deleteActive}><Trash2 className="h-3.5 w-3.5"/> Delete</button></>}<button className="notes-new-btn" onClick={createNote}><Plus className="h-4 w-4" /> New note</button></div>
      </div>

      <div className="notes-workspace__body">
        <WorkspaceNotePicker notes={filtered} activeId={active?.id ?? ''} onSelect={setActiveId} onCreate={createNote} />
        <section className="notes-editor-panel">
          <div className="notes-editor-panel__top">
            <div className="notes-tabbar" role="tablist">
              <button onClick={()=>setTab('document')} className={cn(tab==='document'&&'is-active')}><FileText className="h-4 w-4" /> Document</button>
              <button onClick={()=>setTab('canvas')} className={cn(tab==='canvas'&&'is-active')}><PenTool className="h-4 w-4" /> Canvas</button>
            </div>
            <div className="notes-search"><Search className="h-3.5 w-3.5" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a note…" /></div>
          </div>
          {active ? tab === 'document' ? <BlockDocumentEditor note={active} onChange={(next: WorkspaceNote)=>update(next)} /> : <ExcalidrawCanvas key={active.id} elements={active.canvas_elements as any[]} onChange={(elements)=>update({...active, canvas_elements: Array.from(elements)})} /> : <div className="notes-empty"><Plus className="h-6 w-6" /><p>No notes yet.</p><button onClick={createNote}>Create your first note</button></div>}
        </section>
      </div>
    </div>
  );
}

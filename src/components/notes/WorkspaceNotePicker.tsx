'use client';
import { Plus } from 'lucide-react';
import type { WorkspaceNote } from '@/lib/types';
import { cn } from '@/lib/utils';

export function WorkspaceNotePicker({ notes, activeId, onSelect, onCreate }: { notes: WorkspaceNote[]; activeId: string; onSelect:(id:string)=>void; onCreate:()=>void }) {
  return <aside className="note-picker">
    <div className="note-picker__header"><div><div className="note-picker__eyebrow">Workspace</div><div className="font-semibold text-text-primary">My notes</div></div><button className="note-icon-btn" onClick={onCreate} title="New note"><Plus className="h-4 w-4" /></button></div>
    <div className="note-picker__list">
      {notes.map(note => <button key={note.id} onClick={()=>onSelect(note.id)} className={cn('note-picker__item', activeId===note.id && 'is-active')}><span className="block truncate text-xs font-semibold">{note.title || 'Untitled note'}</span><span className="block truncate text-[10px] text-text-faint">{note.blocks.filter(b=>b.content.trim()).length} blocks</span></button>)}
      {notes.length === 0 && <div className="p-4 text-xs text-text-muted">No notes yet. Create one to get started.</div>}
    </div>
  </aside>;
}

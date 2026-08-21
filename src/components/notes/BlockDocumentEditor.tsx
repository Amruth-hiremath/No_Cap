'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Code2, Heading1, Heading2, List, ListOrdered,
  CheckSquare, Quote, Minus, ChevronDown, GripVertical, Plus, Trash2,
  Copy, ArrowUp, ArrowDown, Type, PanelLeft, Save, Undo2, Redo2, Link2,
  Strikethrough, Highlighter, Eraser, Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceNote, NoteBlock, NoteBlockType } from '@/lib/types';
import { createNoteBlock } from '@/lib/note-defaults';

const TYPES: { type: NoteBlockType; label: string; icon: React.ComponentType<{className?: string}> }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'heading1', label: 'Heading 1', icon: Heading1 },
  { type: 'heading2', label: 'Heading 2', icon: Heading2 },
  { type: 'bullet', label: 'Bulleted list', icon: List },
  { type: 'numbered', label: 'Numbered list', icon: ListOrdered },
  { type: 'checklist', label: 'To-do', icon: CheckSquare },
  { type: 'quote', label: 'Quote', icon: Quote },
  { type: 'callout', label: 'Callout', icon: PanelLeft },
  { type: 'code', label: 'Code', icon: Code2 },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'toggle', label: 'Toggle', icon: ChevronDown },
  { type: 'table', label: 'Table', icon: Table2 },
];

const LANGUAGES = ['text','javascript','typescript','python','java','c','cpp','go','rust','sql','bash','json','yaml'];

function exec(command: string, value?: string) {
  if (typeof document === 'undefined') return;
  document.execCommand(command, false, value);
}

export function BlockDocumentEditor({
  note,
  onChange,
}: {
  note: WorkspaceNote;
  onChange: (note: WorkspaceNote) => void;
}) {
  const [slashFor, setSlashFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkspaceNote[]>([]);
  const [future, setFuture] = useState<WorkspaceNote[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (next: WorkspaceNote, keepHistory = true) => {
    if (keepHistory) {
      setHistory((h) => [...h.slice(-30), note]);
      setFuture([]);
    }
    const stamped = { ...next, updated_at: new Date().toISOString() };
    onChange(stamped);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onChange({ ...stamped }), 400);
  };

  const setTitle = (title: string) => update({ ...note, title });

  const updateBlock = (id: string, patch: Partial<NoteBlock>) => {
    update({ ...note, blocks: note.blocks.map((b) => b.id === id ? { ...b, ...patch } : b) });
  };

  const insertAfter = (id: string, type: NoteBlockType = 'text') => {
    const idx = note.blocks.findIndex((b) => b.id === id);
    const block = createNoteBlock(type);
    update({ ...note, blocks: [...note.blocks.slice(0, idx + 1), block, ...note.blocks.slice(idx + 1)] });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-note-block="${block.id}"] [contenteditable="true"]`)?.focus());
  };

  const deleteBlock = (id: string) => {
    if (note.blocks.length === 1) {
      updateBlock(id, { type: 'text', content: '' });
      return;
    }
    const idx = note.blocks.findIndex((b) => b.id === id);
    const nextBlocks = note.blocks.filter((b) => b.id !== id);
    update({ ...note, blocks: nextBlocks });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-note-block="${nextBlocks[Math.max(0, idx - 1)]?.id}"] [contenteditable="true"]`)?.focus());
  };

  const duplicateBlock = (id: string) => {
    const block = note.blocks.find((b) => b.id === id);
    if (!block) return;
    const copy = { ...block, id: createNoteBlock(block.type).id };
    const idx = note.blocks.findIndex((b) => b.id === id);
    update({ ...note, blocks: [...note.blocks.slice(0, idx + 1), copy, ...note.blocks.slice(idx + 1)] });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = note.blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= note.blocks.length) return;
    const blocks = note.blocks.slice();
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    update({ ...note, blocks });
  };

  const changeType = (id: string, type: NoteBlockType) => {
    updateBlock(id, { type });
    setMenuFor(null);
    setSlashFor(null);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [...f, note]);
    onChange(previous);
  };
  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setFuture((f) => f.slice(0, -1));
    setHistory((h) => [...h, note]);
    onChange(next);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const count = useMemo(() => note.blocks.filter((b) => b.content.trim()).length, [note.blocks]);

  return (
    <div className="note-doc-editor">
      <div className="note-doc-topbar">
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={note.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="min-w-0 bg-transparent text-lg font-semibold text-text-primary outline-none"
            aria-label="Note title"
          />
          <span className="hidden text-[10px] text-text-faint sm:inline">{count} blocks</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="note-icon-btn" onClick={undo} disabled={!history.length} title="Undo"><Undo2 className="h-3.5 w-3.5" /></button>
          <button className="note-icon-btn" onClick={redo} disabled={!future.length} title="Redo"><Redo2 className="h-3.5 w-3.5" /></button>
          <span className="note-save-state"><Save className="h-3 w-3" /> Autosaved</span>
        </div>
      </div>

      <div className="note-inline-toolbar" role="toolbar" aria-label="Text formatting">
        <button onClick={() => exec('bold')} title="Bold"><Bold /></button>
        <button onClick={() => exec('italic')} title="Italic"><Italic /></button>
        <button onClick={() => exec('underline')} title="Underline"><Underline /></button>
        <button onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough /></button>
        <button onClick={() => exec('hiliteColor', 'rgba(245, 190, 60, 0.35)')} title="Highlight"><Highlighter /></button>
        <button onClick={() => exec('removeFormat')} title="Clear formatting"><Eraser /></button>
        <button onClick={() => exec('formatBlock', 'pre')} title="Preformatted"><Code2 /></button>
        <button onClick={() => { const url = window.prompt('Link URL'); if (url) exec('createLink', url); }} title="Link"><Link2 /></button>
      </div>

      <div className="note-doc-canvas">
        {note.blocks.map((block, idx) => (
          <BlockRow
            key={block.id}
            block={block}
            index={idx}
            onUpdate={(patch) => updateBlock(block.id, patch)}
            onAdd={() => insertAfter(block.id)}
            onDelete={() => deleteBlock(block.id)}
            onDuplicate={() => duplicateBlock(block.id)}
            onMove={(d) => moveBlock(block.id, d)}
            onChangeType={(t) => changeType(block.id, t)}
            slashOpen={slashFor === block.id}
            menuOpen={menuFor === block.id}
            onSlash={() => setSlashFor(block.id)}
            onCloseSlash={() => setSlashFor(null)}
            onToggleMenu={() => setMenuFor(menuFor === block.id ? null : block.id)}
            onDragStart={() => setDragId(block.id)}
            onDrop={() => {
              if (!dragId || dragId === block.id) return;
              const from = note.blocks.findIndex((b) => b.id === dragId);
              const to = note.blocks.findIndex((b) => b.id === block.id);
              if (from < 0 || to < 0) return;
              const blocks = note.blocks.slice();
              const [m] = blocks.splice(from, 1);
              blocks.splice(to, 0, m);
              update({ ...note, blocks });
              setDragId(null);
            }}
          />
        ))}
        <button className="note-add-block" onClick={() => insertAfter(note.blocks.at(-1)?.id || '')}><Plus className="h-4 w-4" /> Add block</button>
      </div>
    </div>
  );
}

type BlockRowProps = {
  block: NoteBlock;
  index: number;
  onUpdate: (patch: Partial<NoteBlock>) => void;
  onAdd: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onChangeType: (type: NoteBlockType) => void;
  slashOpen: boolean;
  menuOpen: boolean;
  onSlash: () => void;
  onCloseSlash: () => void;
  onToggleMenu: () => void;
  onDragStart: () => void;
  onDrop: () => void;
};

function BlockRow({ block, index, onUpdate, onAdd, onDelete, onDuplicate, onMove, onChangeType, slashOpen, menuOpen, onSlash, onCloseSlash, onToggleMenu, onDragStart, onDrop }: BlockRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const editable = !['divider'].includes(block.type);
  const placeholder = block.type === 'text' ? 'Type something or press / for blocks…' : block.type === 'code' ? 'Write code…' : block.type === 'toggle' ? 'Toggle title…' : 'Start writing…';

  const contentTypeClass = cn(
    'note-block-content',
    block.type === 'heading1' && 'note-block-h1',
    block.type === 'heading2' && 'note-block-h2',
    block.type === 'bullet' && 'note-block-bullet',
    block.type === 'numbered' && 'note-block-numbered',
    block.type === 'checklist' && 'note-block-check',
    block.type === 'quote' && 'note-block-quote',
    block.type === 'callout' && 'note-block-callout',
    block.type === 'code' && 'note-block-code',
    block.type === 'toggle' && 'note-block-toggle',
  );

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== block.content) ref.current.innerHTML = block.content;
  }, [block.content]);

  if (block.type === 'table') {
    return <div className="note-block-row" data-note-block={block.id} draggable onDragStart={onDragStart} onDrop={onDrop}>
      <BlockControls index={index} onAdd={onAdd} onDelete={onDelete} onDuplicate={onDuplicate} onMove={onMove} onToggleMenu={onToggleMenu} />
      <TableEditor table={block.table || [['Header 1','Header 2'],['','']]} onChange={(table:string[][])=>onUpdate({ table })} />
    </div>;
  }

  if (block.type === 'divider') {
    return <div className="note-block-row" data-note-block={block.id} draggable onDragStart={onDragStart} onDrop={onDrop}>
      <BlockControls index={index} onAdd={onAdd} onDelete={onDelete} onDuplicate={onDuplicate} onMove={onMove} onToggleMenu={onToggleMenu} />
      <hr className="note-divider" />
    </div>;
  }

  return (
    <div className="note-block-row" data-note-block={block.id} draggable onDragStart={onDragStart} onDrop={onDrop}>
      <BlockControls index={index} onAdd={onAdd} onDelete={onDelete} onDuplicate={onDuplicate} onMove={onMove} onToggleMenu={onToggleMenu} />
      <div className="relative min-w-0 flex-1">
        {block.type === 'checklist' ? <label className="note-check-row"><input type="checkbox" checked={Boolean(block.checked)} onChange={(e) => onUpdate({ checked: e.target.checked })} /><Editable refEl={ref} className={contentTypeClass} placeholder={placeholder} onInput={(html:string)=>{ onUpdate({content:html}); }} onKeyDown={(e:React.KeyboardEvent)=>handleKeys(e, onAdd, onDelete, onSlash)} /></label>
        : <Editable refEl={ref} className={contentTypeClass} placeholder={placeholder} onInput={(html:string)=>onUpdate({content:html})} onKeyDown={(e:React.KeyboardEvent)=>handleKeys(e, onAdd, onDelete, onSlash)} />}
        {block.type === 'code' && <div className="note-code-footer"><select value={block.language || 'text'} onChange={(e)=>onUpdate({language:e.target.value})}>{LANGUAGES.map(l=><option key={l}>{l}</option>)}</select><span>Code block</span></div>}
        {block.type === 'callout' && <select className="note-callout-tone" value={block.callout_tone || 'info'} onChange={(e)=>onUpdate({callout_tone:e.target.value as any})}><option value="info">Info</option><option value="tip">Tip</option><option value="warning">Warning</option><option value="important">Important</option></select>}
        {block.type === 'toggle' && <button type="button" className="note-toggle-state" onClick={()=>onUpdate({collapsed:!block.collapsed})}>{block.collapsed ? 'Show details' : 'Collapse details'}</button>}
        {slashOpen && <SlashMenu onSelect={onChangeType} onClose={onCloseSlash} />}
        {menuOpen && <BlockMenu onSelect={onChangeType} onDelete={onDelete} onDuplicate={onDuplicate} onClose={onToggleMenu} />}
      </div>
    </div>
  );
}

function TableEditor({ table, onChange }: { table: string[][]; onChange: (table: string[][]) => void }) {
  const updateCell = (r:number,c:number,value:string) => {
    const next = table.map(row => row.slice());
    if (!next[r]) next[r] = [];
    next[r][c] = value;
    onChange(next);
  };
  const addRow = () => onChange([...table.map(r=>r.slice()), Array.from({length: Math.max(2, table[0]?.length || 2)},()=> '')]);
  const addCol = () => onChange(table.map(r => [...r, '']));
  const removeRow = () => { if (table.length <= 2) return; onChange(table.slice(0,-1)); };
  const removeCol = () => { if ((table[0]?.length || 2) <= 2) return; onChange(table.map(r=>r.slice(0,-1))); };
  return <div className="note-table-wrap">
    <table className="note-table">
      <tbody>{table.map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c} className={r===0?'note-table-head':''}>
        <div contentEditable suppressContentEditableWarning onPaste={(e)=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));}} onInput={(e)=>updateCell(r,c,e.currentTarget.textContent || '')}>{cell}</div>
      </td>)}</tr>)}</tbody>
    </table>
    <div className="note-table-actions"><button type="button" onClick={addRow}>+ Row</button><button type="button" onClick={addCol}>+ Column</button><button type="button" onClick={removeRow}>− Row</button><button type="button" onClick={removeCol}>− Column</button></div>
  </div>;
}

function Editable({ refEl, className, placeholder, onInput, onKeyDown }: any) {
  return <div ref={refEl} className={cn(className,'empty:before:content-[attr(data-placeholder)] empty:before:text-text-faint empty:before:pointer-events-none')} data-placeholder={placeholder} contentEditable suppressContentEditableWarning onPaste={(e)=>{ e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }} onInput={(e)=>onInput((e.currentTarget as HTMLDivElement).innerHTML)} onKeyDown={onKeyDown} />;
}

function handleKeys(e: React.KeyboardEvent, onAdd:()=>void, onDelete:()=>void, onSlash:()=>void) {
  const key = e.key.toLowerCase();
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(); }
  else if (e.key === 'Backspace' && (e.currentTarget as HTMLElement).textContent === '') { e.preventDefault(); onDelete(); }
  else if (e.key === '/' && (e.currentTarget as HTMLElement).textContent === '') onSlash();
}

function BlockControls({ index, onAdd, onDelete, onDuplicate, onMove, onToggleMenu }: any) {
  return <div className="note-block-controls" aria-label={`Block ${index + 1} controls`}>
    <button draggable title="Drag block"><GripVertical className="h-3.5 w-3.5" /></button>
    <button onClick={onAdd} title="Add block"><Plus className="h-3.5 w-3.5" /></button>
    <button onClick={onToggleMenu} title="Block menu"><ChevronDown className="h-3.5 w-3.5" /></button>
    <div className="hidden note-block-extra xl:flex">
      <button onClick={()=>onMove(-1)} title="Move up"><ArrowUp className="h-3 w-3" /></button>
      <button onClick={()=>onMove(1)} title="Move down"><ArrowDown className="h-3 w-3" /></button>
      <button onClick={onDuplicate} title="Duplicate"><Copy className="h-3 w-3" /></button>
      <button onClick={onDelete} title="Delete"><Trash2 className="h-3 w-3" /></button>
    </div>
  </div>;
}

function SlashMenu({ onSelect, onClose }: any) {
  return <div className="note-command-menu">
    <div className="note-command-menu__label">Insert block</div>
    <div className="grid grid-cols-2 gap-1">
      {TYPES.map(({type,label,icon:Icon})=><button key={type} onClick={()=>{onSelect(type);onClose();}}><Icon className="h-3.5 w-3.5" /><span>{label}</span></button>)}
    </div>
  </div>;
}

function BlockMenu({ onSelect, onDelete, onDuplicate, onClose }: any) {
  return <div className="note-command-menu note-command-menu--small">
    <div className="note-command-menu__label">Change block</div>
    <select onChange={(e)=>onSelect(e.target.value)} defaultValue=""><option value="" disabled>Choose type</option>{TYPES.map(t=><option key={t.type} value={t.type}>{t.label}</option>)}</select>
    <div className="mt-2 flex gap-1"><button onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /> Duplicate</button><button onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</button></div>
    <button className="mt-1 w-full" onClick={onClose}>Close</button>
  </div>;
}

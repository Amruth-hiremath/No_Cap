import type { NoteBlock, NoteBlockType, WorkspaceNote } from './types';

export function createNoteBlock(type: NoteBlockType = 'text'): NoteBlock {
  const id = `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  return type === 'table'
    ? { id, type, content: '', table: [['Header 1', 'Header 2'], ['', '']] }
    : { id, type, content: '' };
}

export function defaultNote(): WorkspaceNote {
  const now = new Date().toISOString();
  return { id: `wn_${Date.now().toString(36)}`, title: 'Untitled note', blocks: [createNoteBlock('text')], canvas_elements: [], created_at: now, updated_at: now };
}

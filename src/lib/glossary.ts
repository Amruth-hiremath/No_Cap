import type { GlossaryEntry } from './types';
import glossaryData from '@content/glossary.json';

const glossary = glossaryData as GlossaryEntry[];

export function getGlossary(): GlossaryEntry[] {
  return glossary;
}

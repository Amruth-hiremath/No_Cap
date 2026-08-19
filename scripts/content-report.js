#!/usr/bin/env node
/**
 * NO CAP content completeness report.
 * Run:  npm run content:report
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const CONCEPTS_DIR = path.join(CONTENT_DIR, 'concepts');

const manifest = JSON.parse(fs.readFileSync(path.join(CONCEPTS_DIR, 'manifest.json'), 'utf-8'));

const stats = {
  published: 0,
  draft: 0,
  outline: 0,
  planned: 0,
  other: 0,
  total: 0,
  empty: 0,
  needsDiagrams: 0,
  needsQuizzes: 0,
  needsDeeperTheory: 0,
  mermaid: 0,
  images: 0,
  videos: 0,
  simulations: 0,
  code: 0,
  scenarios: 0,
  sources: 0,
  caseStudiesTotal: 0,
  caseStudiesComplete: 0,
};

const sections = {};
const conceptsBySection = {};

for (const slug of manifest) {
  const fpath = path.join(CONCEPTS_DIR, `${slug}.json`);
  if (!fs.existsSync(fpath)) continue;
  const data = JSON.parse(fs.readFileSync(fpath, 'utf-8'));
  stats.total++;

  const status = data.status || 'unknown';
  if (status === 'published') stats.published++;
  else if (status === 'draft') stats.draft++;
  else if (status === 'outline') stats.outline++;
  else if (status === 'planned') stats.planned++;
  else stats.other++;

  const blocks = data.blocks || [];
  const proseBlocks = blocks.filter(b => b.type === 'prose');
  const diagramBlocks = blocks.filter(b => b.type === 'diagram');
  const quizBlocks = blocks.filter(b => b.type === 'quiz');
  stats.mermaid += blocks.filter(b => b.type === 'mermaid').length;
  stats.images += blocks.filter(b => b.type === 'image').length;
  stats.videos += blocks.filter(b => b.type === 'video').length;
  stats.simulations += blocks.filter(b => b.type === 'simulation').length;
  stats.code += blocks.filter(b => b.type === 'code').length;
  stats.scenarios += blocks.filter(b => b.type === 'scenario').length;
  if (Array.isArray(data.sources)) stats.sources += data.sources.length;
  const proseChars = proseBlocks.reduce((s, b) => s + (b.payload?.text?.length || 0), 0)
    + (data.summary?.length || 0) + (data.why_it_matters?.length || 0);

  if (blocks.length === 0) stats.empty++;
  const mermaidBlocks = blocks.filter(b => b.type === 'mermaid');
  if (mermaidBlocks.length === 0) stats.needsDiagrams++;
  if (quizBlocks.length < 2) stats.needsQuizzes++;
  if (proseChars < 800) stats.needsDeeperTheory++;

  // Track case studies
  if (data.phase === 'case-studies') {
    stats.caseStudiesTotal++;
    if (status === 'published' && blocks.length >= 8 && proseChars >= 1500) {
      stats.caseStudiesComplete++;
    }
  }

  // Track by section
  const area = data.area || 'Unknown';
  if (!sections[area]) {
    sections[area] = { total: 0, published: 0, draft: 0, blocks: 0, chars: 0 };
  }
  sections[area].total++;
  if (status === 'published') sections[area].published++;
  else if (status === 'draft') sections[area].draft++;
  sections[area].blocks += blocks.length;
  sections[area].chars += proseChars;
}

console.log('\n═══════════════════════════════════════════════════');
console.log('  NO CAP CONTENT REPORT');
console.log('═══════════════════════════════════════════════════\n');

console.log('  STATUS');
console.log(`    Published:    ${stats.published}`);
console.log(`    Draft:        ${stats.draft}`);
console.log(`    Outline:      ${stats.outline}`);
console.log(`    Planned:      ${stats.planned}`);
if (stats.other > 0) console.log(`    Other:        ${stats.other}`);
console.log(`    Total:        ${stats.total}\n`);

console.log('  COMPLETENESS');
console.log(`    Complete (published + quality gate): ~${Math.max(0, stats.published - stats.needsDeeperTheory)}`);
console.log(`    Needs diagrams:     ${stats.needsDiagrams}`);
console.log(`    Needs quizzes:      ${stats.needsQuizzes}`);
console.log(`    Needs deeper theory: ${stats.needsDeeperTheory}`);
console.log(`    Empty (0 blocks):   ${stats.empty}\n`);

console.log('  LEARNING MEDIA / INTERACTION');
console.log(`    Mermaid blocks: ${stats.mermaid}`);
console.log(`    Image blocks:   ${stats.images}`);
console.log(`    Video blocks:   ${stats.videos}`);
console.log(`    Simulations:    ${stats.simulations}`);
console.log(`    Code blocks:    ${stats.code}`);
console.log(`    Scenarios:      ${stats.scenarios}`);
console.log(`    Source refs:    ${stats.sources}`);
console.log('');

console.log('  CASE STUDIES');
console.log(`    Complete: ${stats.caseStudiesComplete} / ${stats.caseStudiesTotal}\n`);

console.log('  BY SECTION');
console.log('  ' + '─'.repeat(52));
console.log('  ' + 'Section'.padEnd(28) + 'Total  Pub  Draft  Blocks  Chars');
console.log('  ' + '─'.repeat(52));
for (const [area, s] of Object.entries(sections).sort(([, a], [, b]) => b.chars - a.chars)) {
  const name = area.length > 26 ? area.slice(0, 25) + '…' : area;
  console.log(
    '  ' + name.padEnd(28) +
    String(s.total).padStart(4) + '  ' +
    String(s.published).padStart(3) + '  ' +
    String(s.draft).padStart(5) + '  ' +
    String(s.blocks).padStart(6) + '  ' +
    String(s.chars).padStart(6)
  );
}
console.log('  ' + '─'.repeat(52));

const pct = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;
console.log(`\n  Curriculum completion: ${pct}% (${stats.published}/${stats.total} published)\n`);

if (stats.empty > 0) {
  console.log(`  ⚠️  ${stats.empty} concepts have zero content blocks.`);
  console.log('     These appear in the roadmap but have no lesson material.\n');
}
process.exit(0);

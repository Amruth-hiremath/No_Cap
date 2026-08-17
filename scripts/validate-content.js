#!/usr/bin/env node
/**
 * NO CAP content validator.
 *
 * Run:  npm run content:validate
 *
 * Checks:
 *   - every slug in manifest.json has a corresponding concept file
 *   - every concept file is valid JSON
 *   - every concept has required fields (slug, title, area, phase, summary, blocks, etc.)
 *   - every prerequisite / related slug resolves to an existing concept
 *   - every quiz block has a question, options, answer_index, rationale
 *   - every diagram block has ascii + voice_alt_text
 *   - no duplicate slugs
 *   - tracks.json concept references resolve
 *   - glossary concept_slug references resolve
 *
 * Exits 0 on success, 1 on any error.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const CONCEPTS_DIR = path.join(CONTENT_DIR, 'concepts');
const errors = [];
const warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

/* ── Load manifest ── */
const manifestPath = path.join(CONCEPTS_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  error('content/concepts/manifest.json is missing');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

/* ── Load all concepts ── */
const concepts = {};
const conceptFiles = fs.readdirSync(CONCEPTS_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');

for (const file of conceptFiles) {
  const filePath = path.join(CONCEPTS_DIR, file);
  const slug = file.replace('.json', '');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    error(`Invalid JSON in ${file}: ${e.message}`);
    continue;
  }
  concepts[slug] = data;
}

/* ── Check manifest ↔ files ── */
for (const slug of manifest) {
  if (!concepts[slug]) {
    error(`Manifest references "${slug}" but no file content/concepts/${slug}.json exists`);
  }
}
for (const slug of Object.keys(concepts)) {
  if (!manifest.includes(slug)) {
    warn(`Concept file content/concepts/${slug}.json exists but is not in manifest.json`);
  }
}

/* ── Check duplicate slugs ── */
const seenSlugs = new Set();
for (const [fileSlug, data] of Object.entries(concepts)) {
  const dataSlug = data.slug;
  if (!dataSlug) {
    error(`Concept in ${fileSlug}.json has no "slug" field`);
    continue;
  }
  if (dataSlug !== fileSlug) {
    error(`Concept in ${fileSlug}.json has slug "${dataSlug}" which doesn't match filename`);
  }
  if (seenSlugs.has(dataSlug)) {
    error(`Duplicate slug "${dataSlug}"`);
  }
  seenSlugs.add(dataSlug);
}

/* ── Check required fields ── */
const requiredFields = [
  'slug', 'version', 'title', 'phase', 'area',
  'estimated_minutes', 'difficulty', 'summary',
  'prerequisites', 'related', 'blocks',
  'trade_offs', 'common_mistakes', 'where_you_see_it',
  'interview_prompts', 'status'
];

for (const [fileSlug, data] of Object.entries(concepts)) {
  for (const field of requiredFields) {
    if (data[field] === undefined) {
      error(`${fileSlug}.json: missing required field "${field}"`);
    }
  }

  /* Check prerequisites resolve */
  for (const prereq of (data.prerequisites || [])) {
    if (!concepts[prereq]) {
      error(`${fileSlug}.json: prerequisite "${prereq}" does not resolve to any concept`);
    }
  }

  /* Check related resolve */
  for (const rel of (data.related || [])) {
    if (!concepts[rel]) {
      error(`${fileSlug}.json: related concept "${rel}" does not resolve`);
    }
  }

  /* Check quiz blocks */
  for (const block of (data.blocks || [])) {
    if (block.type === 'quiz') {
      const p = block.payload;
      if (!p.question) error(`${fileSlug}.json: quiz block ${block.id} has no question`);
      if (!p.options || !Array.isArray(p.options) || p.options.length < 2) {
        error(`${fileSlug}.json: quiz block ${block.id} needs at least 2 options`);
      }
      if (p.answer_index === undefined && p.answer_indices === undefined) {
        error(`${fileSlug}.json: quiz block ${block.id} has no answer_index or answer_indices`);
      }
      if (!p.rationale) {
        warn(`${fileSlug}.json: quiz block ${block.id} has no rationale`);
      }
    }
    if (block.type === 'diagram') {
      const p = block.payload;
      if (!p.ascii) error(`${fileSlug}.json: diagram block ${block.id} has no ascii`);
      if (!p.voice_alt_text) {
        warn(`${fileSlug}.json: diagram block ${block.id} has no voice_alt_text (needed for accessibility/voice mode)`);
      }
    }
  }

  /* Check trade_offs structure */
  if (data.trade_offs) {
    if (!Array.isArray(data.trade_offs.pros)) {
      error(`${fileSlug}.json: trade_offs.pros must be an array`);
    }
    if (!Array.isArray(data.trade_offs.cons)) {
      error(`${fileSlug}.json: trade_offs.cons must be an array`);
    }
  }
}

/* ── Check tracks.json ── */
const tracksPath = path.join(CONTENT_DIR, 'tracks.json');
if (fs.existsSync(tracksPath)) {
  const tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf-8'));
  for (const track of tracks) {
    for (const phase of (track.phases || [])) {
      for (const slug of (phase.concepts || [])) {
        if (!concepts[slug]) {
          error(`tracks.json: phase "${phase.title}" references concept "${slug}" which does not exist`);
        }
      }
    }
  }
}

/* ── Check glossary concept_slug references ── */
const glossaryPath = path.join(CONTENT_DIR, 'glossary.json');
if (fs.existsSync(glossaryPath)) {
  const glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf-8'));
  for (const entry of glossary) {
    if (entry.concept_slug && !concepts[entry.concept_slug]) {
      error(`glossary.json: entry "${entry.term}" references concept "${entry.concept_slug}" which does not exist`);
    }
  }
}

/* ── Report ── */
if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ Errors:');
  errors.forEach(e => console.error(`   ${e}`));
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}

console.log(`\n✅ Content valid: ${Object.keys(concepts).length} concepts, ${warnings.length} warning(s)`);
process.exit(0);

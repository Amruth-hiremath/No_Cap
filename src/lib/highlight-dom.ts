export type HighlightColor = 'amber' | 'green' | 'rust' | 'info';

const COLOR_CLASS: Record<HighlightColor, string> = {
  amber: 'nocap-highlight--amber',
  green: 'nocap-highlight--green',
  rust: 'nocap-highlight--rust',
  info: 'nocap-highlight--info',
};

function textNodes(scope: Node): Text[] {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('.nocap-highlight, script, style, noscript')) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function rangeFromTextOffset(scope: Node, startOffset: number, endOffset: number): Range | null {
  const nodes = textNodes(scope);
  let cursor = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startIndex = 0;
  let endIndex = 0;
  for (const node of nodes) {
    const len = (node.nodeValue || '').length;
    const next = cursor + len;
    if (!startNode && startOffset >= cursor && startOffset <= next) { startNode = node; startIndex = Math.max(0, startOffset - cursor); }
    if (!endNode && endOffset >= cursor && endOffset <= next) { endNode = node; endIndex = Math.max(0, endOffset - cursor); break; }
    cursor = next;
  }
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, Math.min(startIndex, (startNode.nodeValue || '').length));
  range.setEnd(endNode, Math.min(endIndex, (endNode.nodeValue || '').length));
  return range;
}

function findRange(scope: Node, target: string): Range | null {
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;
  const nodes = textNodes(scope);
  for (const node of nodes) {
    const raw = node.nodeValue || '';
    const exact = raw.indexOf(target);
    if (exact >= 0) {
      const range = document.createRange();
      range.setStart(node, exact);
      range.setEnd(node, exact + target.length);
      return range;
    }
  }
  // Build a per-node normalized search rather than a cross-block match.
  for (const node of nodes) {
    const raw = node.nodeValue || '';
    const compact = normalizeText(raw);
    const startCompact = compact.toLowerCase().indexOf(normalizedTarget.toLowerCase());
    if (startCompact >= 0) {
      const startRaw = raw.toLowerCase().indexOf(normalizedTarget.toLowerCase());
      if (startRaw >= 0) {
        const range = document.createRange();
        range.setStart(node, startRaw);
        range.setEnd(node, Math.min(raw.length, startRaw + target.length));
        return range;
      }
    }
  }
  return null;
}

export function clearRenderedHighlights(scope: HTMLElement): void {
  const spans = Array.from(scope.querySelectorAll<HTMLElement>('.nocap-highlight'));
  for (const span of spans) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  }
}

export function wrapTextHighlight(scope: HTMLElement, selectedText: string, color: HighlightColor): boolean {
  const range = findRange(scope, selectedText);
  if (!range || range.collapsed) return false;
  const mark = document.createElement('mark');
  mark.className = `nocap-highlight ${COLOR_CLASS[color] || COLOR_CLASS.amber}`;
  mark.dataset.highlightedText = selectedText;
  try {
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
    return true;
  } catch {
    return false;
  }
}

export function scrollToText(scope: HTMLElement, selectedText: string, behavior: ScrollBehavior = 'smooth', anchorStart?: number, anchorEnd?: number): boolean {
  const range = (typeof anchorStart === 'number' && typeof anchorEnd === 'number' ? rangeFromTextOffset(scope, anchorStart, anchorEnd) : null) || findRange(scope, selectedText);
  if (!range) return false;
  const container = range.startContainer instanceof Element
    ? range.startContainer
    : range.startContainer.parentElement;
  const block = container?.closest('[data-block-id]') as HTMLElement | null;
  block?.scrollIntoView({ behavior, block: 'center' });
  if (block) { block.classList.add('nocap-note-target'); window.setTimeout(() => block.classList.remove('nocap-note-target'), 1600); }
  const mark = document.createElement('mark');
  mark.className = `nocap-note-jump`;
  try { const fragment = range.cloneContents(); mark.appendChild(fragment); range.deleteContents(); range.insertNode(mark); window.setTimeout(() => { const parent = mark.parentNode; if (!parent) return; while (mark.firstChild) parent.insertBefore(mark.firstChild, mark); parent.removeChild(mark); }, 1800); } catch {}
  return true;
}

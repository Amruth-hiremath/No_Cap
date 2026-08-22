#!/usr/bin/env python3
"""
Migrate all legacy diagram blocks to Mermaid blocks.

For each concept JSON file:
1. Find blocks with type="diagram" that have an "ascii" field
2. Convert the ASCII art to a Mermaid flowchart
3. Replace the block type with "mermaid"
4. Move ascii to alt_text, create mermaid code in code field
5. Preserve caption and voice_alt_text

The conversion is heuristic — it creates a simple flowchart TD
from the ASCII art lines, treating arrows (↓, |, v, →) as edges.
"""
import json, os, re

CONCEPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'concepts')

def ascii_to_mermaid(ascii_art: str) -> str:
    """Convert ASCII art to a basic Mermaid flowchart.
    
    This is a heuristic converter — it won't be perfect for every diagram,
    but it produces a valid Mermaid graph that's better than raw ASCII.
    """
    lines = [l.rstrip() for l in ascii_art.strip().split('\n')]
    
    # Extract node labels (text between common ASCII diagram chars)
    nodes = []
    edges = []
    node_map = {}  # label -> id
    
    def get_node_id(label):
        if label not in node_map:
            node_map[label] = f'N{len(node_map)}'
        return node_map[label]
    
    for line in lines:
        # Find text in brackets [], parentheses (), or arrows > 
        # Also find standalone labels
        cleaned = line.strip()
        if not cleaned:
            continue
        
        # Skip pure connector lines (just arrows/pipes/dashes)
        if re.match(r'^[│├└┌─┐┘┤┬┴┼↓↑→←▼▲└┘┌┐|/\\\-+=\s]*$', cleaned):
            continue
        
        # Extract labels from common patterns
        labels = re.findall(r'\[([^\]]+)\]', cleaned)
        labels += re.findall(r'\(([^\)]+)\)', cleaned)
        labels += re.findall(r'\{([^}]+)\}', cleaned)
        
        # Also try to find standalone text (not just connectors)
        text_parts = re.split(r'[│├└┌─┐┘┤┬┴┼↓↑→←▼▲|/\\\-+=\s]+', cleaned)
        text_parts = [t.strip() for t in text_parts if t.strip() and len(t.strip()) > 2]
        
        all_labels = labels + text_parts
        for label in all_labels:
            if label and label not in node_map and len(label) < 60:
                get_node_id(label)
    
    # If we found nodes, create a flowchart
    if not node_map:
        # Fallback: just wrap the ASCII in a Mermaid node
        escaped = ascii_art.replace('"', "'").replace('\n', '<br/>')
        return f'flowchart TD\n    A["{escaped[:200]}"]'
    
    # Build edges — connect nodes in order of appearance
    node_ids = list(node_map.values())
    for i in range(len(node_ids) - 1):
        edges.append(f'    {node_ids[i]} --> {node_ids[i+1]}')
    
    # Build the Mermaid code
    lines = ['flowchart TD']
    for label, nid in node_map.items():
        safe_label = label.replace('"', "'")
        lines.append(f'    {nid}["{safe_label}"]')
    lines.extend(edges)
    
    return '\n'.join(lines)


def migrate_concept(filepath):
    """Migrate a single concept file's diagram blocks to mermaid."""
    with open(filepath) as f:
        data = json.load(f)
    
    changed = False
    migrated_count = 0
    
    for block in data.get('blocks', []):
        if block.get('type') == 'diagram':
            payload = block.get('payload', {})
            ascii_art = payload.get('ascii', '')
            caption = payload.get('caption', '')
            voice_alt = payload.get('voice_alt_text', payload.get('alt_text', ''))
            
            if not ascii_art:
                continue
            
            # Convert to Mermaid
            mermaid_code = ascii_to_mermaid(ascii_art)
            
            # Replace the block
            block['type'] = 'mermaid'
            block['payload'] = {
                'code': mermaid_code,
                'caption': caption,
                'alt_text': voice_alt or ascii_art[:200],
            }
            
            changed = True
            migrated_count += 1
    
    if changed:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
    
    return migrated_count


# Process all concept files
total_migrated = 0
files_changed = 0

for fname in sorted(os.listdir(CONCEPTS_DIR)):
    if not fname.endswith('.json') or fname == 'manifest.json':
        continue
    fpath = os.path.join(CONCEPTS_DIR, fname)
    count = migrate_concept(fpath)
    if count > 0:
        total_migrated += count
        files_changed += 1
        print(f'  {fname}: migrated {count} diagram blocks')

print(f'\nTotal: {total_migrated} diagram blocks migrated across {files_changed} files')

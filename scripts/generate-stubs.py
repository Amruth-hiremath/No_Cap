#!/usr/bin/env python3
"""
Generate stub JSON files for all concepts in the curriculum that don't have one yet.
Each stub has the proper schema with status='draft' so the UI can distinguish
published (full content) from draft (placeholder).
"""
import json, os, sys

CURR_PATH = os.path.join(os.path.dirname(__file__), '..', 'content', 'curriculum.json')
CONCEPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'concepts')

with open(CURR_PATH) as f:
    curriculum = json.load(f)

stubs_created = 0
existing = 0

for section in curriculum['sections']:
    for entry in section['concepts']:
        slug = entry['slug']
        fpath = os.path.join(CONCEPTS_DIR, f'{slug}.json')
        if os.path.exists(fpath):
            existing += 1
            # Ensure it has the right area/phase from curriculum
            with open(fpath) as f:
                data = json.load(f)
            changed = False
            if data.get('area') != section['title']:
                data['area'] = section['title']
                changed = True
            if data.get('phase') != section['slug']:
                data['phase'] = section['slug']
                changed = True
            if data.get('status') != entry['status'] and entry['status'] == 'draft' and data.get('status') == 'published':
                # Don't downgrade published -> draft; keep published
                pass
            elif data.get('status') != entry['status']:
                data['status'] = entry['status']
                changed = True
            if changed:
                with open(fpath, 'w') as f:
                    json.dump(data, f, indent=2)
                    f.write('\n')
        else:
            # Create stub
            stub = {
                "slug": slug,
                "version": 1,
                "title": entry['title'],
                "phase": section['slug'],
                "area": section['title'],
                "estimated_minutes": entry.get('estimated_minutes', 10),
                "difficulty": entry.get('difficulty', 'core'),
                "summary": f"This lesson covers {entry['title']}. Content is being prepared — add it to content/concepts/{slug}.json.",
                "why_it_matters": "",
                "prerequisites": entry.get('prerequisites', []),
                "related": entry.get('related', []),
                "used_in": [],
                "blocks": [],
                "trade_offs": {"pros": [], "cons": []},
                "failure_modes": [],
                "common_mistakes": [],
                "where_you_see_it": [],
                "interview_prompts": [],
                "real_system_mappings": [],
                "status": entry['status'],
            }
            with open(fpath, 'w') as f:
                json.dump(stub, f, indent=2)
                f.write('\n')
            stubs_created += 1

# Regenerate manifest from curriculum
all_slugs = []
for section in curriculum['sections']:
    for entry in section['concepts']:
        all_slugs.append(entry['slug'])

manifest_path = os.path.join(CONCEPTS_DIR, 'manifest.json')
with open(manifest_path, 'w') as f:
    json.dump(all_slugs, f, indent=2)
    f.write('\n')

# Regenerate tracks.json from curriculum
tracks = [{
    "slug": "system-design-curriculum",
    "title": "System Design Curriculum",
    "description": "The complete learning path from foundations to interview readiness.",
    "phases": [
        {
            "slug": section['slug'],
            "title": section['title'],
            "description": section['description'],
            "concepts": [c['slug'] for c in section['concepts']],
            "order": section['order'],
        }
        for section in curriculum['sections']
    ]
}]
tracks_path = os.path.join(os.path.dirname(__file__), '..', 'content', 'tracks.json')
with open(tracks_path, 'w') as f:
    json.dump(tracks, f, indent=2)
    f.write('\n')

print(f"Stubs created: {stubs_created}")
print(f"Existing concepts updated: {existing}")
print(f"Total concepts in manifest: {len(all_slugs)}")
print(f"Tracks regenerated: {len(tracks[0]['phases'])} phases")

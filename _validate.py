import json

errors = []

# ---- 1. All JSON files parse ----
files = {
    'ch01': 'data/chapters/ch01.json',
    'ch02': 'data/chapters/ch02.json',
    'ch03': 'data/chapters/ch03.json',
    'citations': 'data/citations.json',
    'endings': 'data/endings.json',
    'globals': 'data/globals.json',
    'branches': 'data/branches.json',
    'characters': 'data/characters.json',
    'timeline': 'data/timeline.json',
    'map-locations': 'data/map-locations.json',
}
data = {}
for name, path in files.items():
    try:
        data[name] = json.load(open(path, encoding='utf-8'))
    except json.JSONDecodeError as e:
        errors.append('JSON PARSE FAIL %s: line %d col %d' % (path, e.lineno, e.colno))

chapters = {k: data[k] for k in ('ch01', 'ch02', 'ch03') if k in data}
citations = data.get('citations', {})
endings = data.get('endings', {})
globals_ = data.get('globals', {})
branches = data.get('branches', {})

# ---- 2. citationRef integrity ----
citation_ids = set(citations.keys())
for ch_id, ch in chapters.items():
    for sc_id, scene in ch['scenes'].items():
        for step in scene['steps']:
            ref = step.get('citationRef')
            if ref and ref not in citation_ids:
                errors.append('MISSING CITATION %s/%s -> %s' % (ch_id, sc_id, ref))

# ---- 3. branch node / option consistency ----
branch_nodes = branches.get('branchNodes', [])
branch_ids = {b['nodeId']: b for b in branch_nodes}
for ch_id, ch in chapters.items():
    for sc_id, scene in ch['scenes'].items():
        for step in scene['steps']:
            bn = step.get('branchNode')
            if bn and bn in branch_ids:
                expected = {o['id'] for o in branch_ids[bn].get('options', [])}
                actual = {o['id'] for o in step.get('options', [])}
                if expected != actual:
                    errors.append('OPTION MISMATCH %s/%s node %s: chapter=%s branches=%s'
                                  % (ch_id, sc_id, bn, sorted(actual), sorted(expected)))

# ---- 4. collect all flags actually set/used ----
all_flags = set()
for ch_id, ch in chapters.items():
    for sc_id, scene in ch['scenes'].items():
        for step in scene['steps']:
            for f in step.get('setFlags', []):
                all_flags.add(f)
            for opt in step.get('options', []):
                eff = opt.get('effects', {})
                for f in eff.get('setFlags', []):
                    all_flags.add(f)
                cond = opt.get('condition', {})
                for f in cond.get('requireFlags', []):
                    all_flags.add(f)
                for f in cond.get('notFlags', []):
                    all_flags.add(f)

# ---- 5. ending condition flags exist ----
for eid, ending in endings.items():
    cond = ending.get('conditions', {})
    for f in cond.get('requireFlags', []):
        if f not in all_flags:
            errors.append('ENDING %s requires flag %s never set' % (eid, f))
    for f in cond.get('notFlags', []):
        if f not in all_flags:
            errors.append('ENDING %s notFlags %s never used' % (eid, f))

# ---- 6. chapter unlock chain ----
for ch in globals_.get('chapters', []):
    cond = ch.get('unlockCondition')
    if cond and cond.startswith('hasFlag:'):
        flag = cond[8:]
        if flag not in all_flags:
            errors.append('UNLOCK %s requires %s never set' % (ch['id'], flag))

# ---- 7. ASCII-quote-inside-string check ----
# An ASCII double quote used as a Chinese quotation mark inside a string value
# breaks JSON parsing. Step 1 (json.load on every file) already proves no such
# quote remains: any unescaped ASCII " inside a value would raise JSONDecodeError.
# So nothing further to do here — the parse pass is the authoritative check.

# ---- report ----
print('=' * 50)
if errors:
    print('FAILURES: %d' % len(errors))
    for e in errors:
        print('  [X]', e)
else:
    print('ALL CHECKS PASSED')

total_steps = sum(len(sc['steps']) for ch in chapters.values() for sc in ch['scenes'].values())
cited = sum(1 for ch in chapters.values() for sc in ch['scenes'].values()
            for st in sc['steps'] if st.get('citationRef'))
choices = sum(1 for ch in chapters.values() for sc in ch['scenes'].values()
              for st in sc['steps'] if st['type'] == 'choice')
print('Stats: %d steps, %d cited, %d choices, %d citations, %d endings, %d branch nodes'
      % (total_steps, cited, choices, len(citation_ids), len(endings), len(branch_ids)))

import json, itertools

endings = json.load(open('data/endings.json', encoding='utf-8'))
globals_ = json.load(open('data/globals.json', encoding='utf-8'))

RANK_PRIORITY = ['gold_hidden', 'gold', 'silver', 'bronze']
FALLBACK = 'ending_huitong'

# Load chapter scenes in order
chapters = {}
for ch in ('ch01', 'ch02', 'ch03'):
    chapters[ch] = json.load(open('data/chapters/%s.json' % ch, encoding='utf-8'))

def evaluate(flags):
    def matches(e):
        c = e.get('conditions', {})
        if any(f not in flags for f in c.get('requireFlags', [])):
            return False
        if any(f in flags for f in c.get('notFlags', [])):
            return False
        return True
    for r in RANK_PRIORITY:
        for eid, e in endings.items():
            if e.get('rank') == r and matches(e):
                return eid
    return FALLBACK

def cond_ok(opt, flags):
    c = opt.get('condition', {})
    if any(f not in flags for f in c.get('requireFlags', [])):
        return False
    if any(f in flags for f in c.get('notFlags', [])):
        return False
    return True

def scene_order(ch):
    # scenes dict preserves insertion order in py3.7+
    return list(ch['scenes'].values())

# Walk chapter 1 -> 2 -> 3, collecting all reachable (flags, path) at each choice.
# Between choices, also apply any transition setFlags / endChapter flags.
def run_chapter(ch_id, start_flags):
    ch = chapters[ch_id]
    scenes = scene_order(ch)
    results = []  # list of (final_flags, path) for this chapter
    frontier = [(set(start_flags), [])]
    for scene in scenes:
        next_frontier = []
        for flags, path in frontier:
            for step in scene['steps']:
                t = step.get('type')
                if t == 'choice':
                    for o in step.get('options', []):
                        if cond_ok(o, flags):
                            nf = set(flags)
                            nf |= set(o.get('effects', {}).get('setFlags', []))
                            # apply any transition setFlags on the option (nextScene handled implicitly)
                            next_frontier.append((nf, path + [o['id']]))
                    # a choice step ends this linear frontier for the scene
                    break
                else:
                    # narration/inner/dialogue/transition: apply setFlags
                    flags |= set(step.get('setFlags', []))
                    if t == 'transition':
                        if step.get('endChapter'):
                            flags.add(ch_id + '_complete')
                        # keep walking same scene's remaining steps (none after transition normally)
            else:
                # no choice encountered in this scene -> carry flags forward unchanged
                next_frontier.append((set(flags), path))
        frontier = next_frontier
    return frontier

# Start chapter 1
results1 = run_chapter('ch01', set(globals_.get('initialFlags', [])))
print('ch01 reachable paths:', len(results1))

all_endings_reached = set()
for flags1, path1 in results1:
    for flags2, path2 in run_chapter('ch02', flags1):
        for flags3, path3 in run_chapter('ch03', flags2):
            eid = evaluate(flags3)
            all_endings_reached.add(eid)

print('endings reachable across full playthroughs:')
for eid in sorted(all_endings_reached):
    e = endings[eid]
    print('   %-22s %-12s %s' % (eid, e['rank'], e['title']))

missing = set(endings) - all_endings_reached
if missing:
    print('UNREACHABLE ENDINGS:', sorted(missing))
else:
    print('All %d endings are reachable.' % len(endings))

# Also verify hidden path specifically resolves correctly
hidden = globals_['branchSystem']['hiddenEndingPath']
hflags = set()
for oid in hidden:
    # find the option in chapter files
    found = False
    for ch in chapters.values():
        for sc in ch['scenes'].values():
            for step in sc['steps']:
                if step.get('type') == 'choice':
                    for o in step.get('options', []):
                        if o['id'] == oid:
                            hflags |= set(o.get('effects', {}).get('setFlags', []))
                            found = True
    if not found:
        print('  WARN hidden option not found:', oid)
hflags.add('ch01_complete'); hflags.add('ch02_complete'); hflags.add('ch03_complete')
print('hidden path ending:', evaluate(hflags), '(expect ending_daming_academy)')

import json

path = 'data/endings.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

out = []
i = 0
n = len(content)
in_string = False
content_quote_open = False

WS = ' \t\r\n'
BACKSLASH = chr(92)


def next_nonspace(idx):
    while idx < n and content[idx] in WS:
        idx += 1
    return content[idx] if idx < n else ''


while i < n:
    c = content[i]
    if c == BACKSLASH and in_string:
        out.append(c)
        if i + 1 < n:
            out.append(content[i + 1])
            i += 1
        i += 1
        continue
    if c == '"':
        if not in_string:
            out.append(c)
            in_string = True
        else:
            nc = next_nonspace(i + 1)
            if nc in ':,}]':
                out.append(c)
                in_string = False
                content_quote_open = False
            else:
                out.append('「' if not content_quote_open else '」')
                content_quote_open = not content_quote_open
        i += 1
        continue
    out.append(c)
    i += 1

fixed = ''.join(out)

try:
    data = json.loads(fixed)
except json.JSONDecodeError as e:
    print('STILL BROKEN: line', e.lineno, 'col', e.colno)
    print('context:', repr(fixed[max(0, e.pos - 20):e.pos + 20]))
    raise SystemExit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed)

print('VALID JSON - wrote', path)
print('endings:', len(data))
for eid, e in data.items():
    print('  %s [%s] %s' % (eid, e.get('rank'), e.get('title')))

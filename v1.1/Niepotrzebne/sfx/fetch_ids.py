import json, re, sys, os, html, time
from fetch import get
HERE = os.path.dirname(os.path.abspath(__file__))
picks = json.loads(open(os.path.join(HERE, 'picks.json')).read())
out = {}
for key, sid in picks.items():
    fn = os.path.join(HERE, 'raw', f'{key}__{sid}.ogg')
    page = get(f'https://freesound.org/s/{sid}/').decode('utf8', 'replace')
    ogg = re.search(r'data-ogg="([^"]+)"', page)
    lic = re.search(r'creativecommons\.org/(publicdomain/zero|licenses/[a-z-]+)/[\d.]+', page)
    title = re.search(r'data-title="([^"]*)"', page)
    user = re.search(r'data-username="([^"]*)"', page)
    url = ogg.group(1).replace('-lq.ogg', '-hq.ogg')
    if not os.path.exists(fn):
        os.makedirs(os.path.dirname(fn), exist_ok=True)
        open(fn, 'wb').write(get(url))
    out[key] = {'id': sid, 'title': html.unescape(title.group(1)) if title else '', 'user': user.group(1) if user else '', 'license': lic.group(0) if lic else '?', 'url': f'https://freesound.org/s/{sid}/'}
    print(key, sid, out[key]['license'], out[key]['title'][:50])
    time.sleep(2)
json.dump(out, open(os.path.join(HERE, 'credits.json'), 'w'), indent=1, ensure_ascii=False)

import json, re, sys, time, urllib.parse, urllib.request, urllib.error, html, os
HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141 Safari/537.36'}

def get(url):
    for k in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 4: raise
            time.sleep(20 * (k + 1))

def search(q, sort='Downloads desc', pages=1):
    out = []
    for page in range(1, pages + 1):
        url = 'https://freesound.org/search/?' + urllib.parse.urlencode({'q': q, 'f': 'license:"Creative Commons 0"', 's': sort, 'page': page})
        s = get(url).decode('utf8', 'replace')
        for m in re.finditer(r'<div\s+class="bw-player"(.*?)tabindex', s, re.S):
            b = m.group(1)
            a = lambda k: (re.search(k + r'="([^"]*)"', b) or [None, ''])[1]
            out.append({'id': int(a('data-sound-id')), 'user': a('data-username'), 'title': html.unescape(a('data-title')), 'dur': float(a('data-duration') or 0), 'downloads': int(a('data-num-downloads') or 0), 'ogg': a('data-ogg').replace('-lq.ogg', '-hq.ogg'), 'mp3': a('data-mp3').replace('-lq.mp3', '-hq.mp3')})
        time.sleep(3)
    return out

if __name__ == '__main__':
    spec = json.load(open(os.path.join(HERE, 'spec.json')))
    cat = {}
    for key, s in spec.items():
        res = []
        for q in s['q']:
            try: res += search(q)
            except Exception as e: print('ERR', key, q, e)
        seen, pick = set(), []
        for r in sorted(res, key=lambda r: -r['downloads']):
            if r['id'] in seen or not (s.get('min', 0) <= r['dur'] <= s['max']): continue
            if any(w in r['title'].lower() for w in s.get('avoid', [])): continue
            seen.add(r['id']); pick.append(r)
            if len(pick) >= s.get('n', 3): break
        cat[key] = pick
        for r in pick:
            fn = os.path.join(HERE, 'raw', f"{key}__{r['id']}.ogg")
            if not os.path.exists(fn):
                os.makedirs(os.path.dirname(fn), exist_ok=True)
                try: open(fn, 'wb').write(get(r['ogg']))
                except Exception as e: print('DLERR', key, r['id'], e)
        print(key, [(r['id'], r['title'][:50], round(r['dur'], 1), r['downloads']) for r in pick])
    json.dump(cat, open(os.path.join(HERE, 'catalog.json'), 'w'), indent=1)

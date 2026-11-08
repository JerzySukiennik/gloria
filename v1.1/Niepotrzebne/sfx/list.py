import json, sys
from fetch import search
qs = json.loads(sys.argv[1])
for key, (queries, mx) in qs.items():
    res, seen = [], set()
    for q in queries:
        for r in search(q):
            if r['id'] in seen or r['dur'] > mx: continue
            seen.add(r['id']); res.append(r)
    res.sort(key=lambda r: -r['downloads'])
    print('##', key)
    for r in res[:14]: print(f"  {r['id']:>7} {r['dur']:5.1f}s {r['downloads']:>6}  {r['title'][:70]}  ({r['user']})")

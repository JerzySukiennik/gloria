# Gloria lyrics timing: aligns Whisper word times from our own audio to the LRCLIB line/word order and writes a map with no lyric text.
import json, re, sys, unicodedata, urllib.request
from difflib import SequenceMatcher

SONGS = {'yes': 5845511, 'techno': 4066241, 'psy': 4066241}


def lrc_lines(lrclib_id):
    req = urllib.request.Request(f'https://lrclib.net/api/get/{lrclib_id}', headers={'User-Agent': 'gloria-lyrics-align/1.0 (https://gloria.gzowo.fun)'})
    data = json.load(urllib.request.urlopen(req, timeout=30))
    lines = []
    for raw in (data.get('syncedLyrics') or '').split('\n'):
        text = re.sub(r'\[[^\]]*\]', '', raw).strip()
        if text:
            lines.append(text.split())
    return lines


def norm(w):
    w = unicodedata.normalize('NFKD', w.lower())
    return ''.join(c for c in w if c.isalnum())


def sim(a, b):
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def align(words, lines):
    flat = []
    for li, ln in enumerate(lines):
        for wi, w in enumerate(ln):
            flat.append((li, wi, norm(w), wi == 0, wi == len(ln) - 1))
    S, N = len(flat), len(words)
    ww = [norm(w['w']) for w in words]
    NEG = -1e9
    score = [[NEG] * S for _ in range(N)]
    back = [[None] * S for _ in range(N)]
    starts = [s for s in range(S) if flat[s][3]]
    for i in range(N):
        best_prev, best_s = NEG, -1
        if i > 0:
            for s in range(S):
                if score[i - 1][s] > best_prev:
                    best_prev, best_s = score[i - 1][s], s
        for s in range(S):
            m = sim(ww[i], flat[s][2])
            gain = 2.2 * m if m >= 0.5 else -1.2
            cands = []
            if i == 0:
                if flat[s][3]:
                    cands.append((gain, None, 'm'))
            else:
                if s > 0 and flat[s - 1][0] == flat[s][0] and score[i - 1][s - 1] > NEG:
                    cands.append((score[i - 1][s - 1] + gain, s - 1, 'm'))
                if s > 1 and flat[s - 2][0] == flat[s][0] and score[i - 1][s - 2] > NEG:
                    cands.append((score[i - 1][s - 2] + gain - 0.8, s - 2, 'm'))
                if flat[s][3] and best_prev > NEG:
                    cands.append((best_prev + gain - 0.6, best_s, 'm'))
                if score[i - 1][s] > NEG:
                    cands.append((score[i - 1][s] - 0.7, s, 'x'))
            if cands:
                v, b, kind = max(cands, key=lambda c: c[0])
                score[i][s] = v
                back[i][s] = (b, kind)
    s = max(range(S), key=lambda k: score[N - 1][k])
    path = []
    for i in range(N - 1, -1, -1):
        b, kind = back[i][s]
        path.append((i, s, kind))
        if b is None:
            break
        s = b
    path.reverse()
    seen = set()
    out = []
    for i, s, kind in path:
        if kind != 'm' or (i in seen):
            continue
        seen.add(i)
        li, wi, nw, _, _ = flat[s]
        if sim(ww[i], nw) < 0.5:
            continue
        out.append({'t': words[i]['s'], 'e': words[i]['e'], 'line': li, 'word': wi})
    return out


def sentences(matches, lines):
    groups, cur = [], None
    for m in matches:
        if cur and m['line'] == cur['line'] and m['word'] > cur['last'] and m['t'] - cur['end'] < 2.5:
            cur['m'].append(m); cur['last'] = m['word']; cur['end'] = m['e']
        else:
            cur = {'line': m['line'], 'last': m['word'], 'end': m['e'], 'm': [m]}
            groups.append(cur)
    out = []
    for g in groups:
        n = len(lines[g['line']])
        ms = g['m']
        if len(ms) < 2 and not (n == 1 or len(ms) / n >= 0.5):
            continue
        times = {m['word']: m['t'] for m in ms}
        first, last = ms[0]['word'], ms[-1]['word']
        lo = 0 if first <= max(1, n // 4) else first
        hi = n - 1 if (n - 1 - last) <= max(1, n // 4) else last
        known = sorted(times)
        words = []
        for wi in range(lo, hi + 1):
            if wi in times:
                t = times[wi]
            else:
                prev = max([k for k in known if k < wi], default=None)
                nxt = min([k for k in known if k > wi], default=None)
                if prev is not None and nxt is not None:
                    t = times[prev] + (times[nxt] - times[prev]) * (wi - prev) / (nxt - prev)
                elif prev is not None:
                    t = times[prev] + 0.22 * (wi - prev)
                else:
                    t = times[nxt] - 0.22 * (nxt - wi)
            words.append([round(t, 3), g['line'], wi])
        t1 = max(ms[-1]['e'], words[-1][0] + 0.25)
        out.append({'t0': round(words[0][0], 3), 't1': round(t1, 3), 'words': words})
    out.sort(key=lambda s: s['t0'])
    for a, b in zip(out, out[1:]):
        if a['t1'] > b['t0'] - 0.05:
            a['t1'] = round(max(a['words'][-1][0] + 0.1, b['t0'] - 0.05), 3)
    return out


def main(words_json, out_dir):
    data = json.load(open(words_json))
    for key, lid in SONGS.items():
        if key not in data:
            continue
        lines = lrc_lines(lid)
        words = data[key]['words']
        matches = align(words, lines)
        sents = sentences(matches, lines)
        json.dump({'lrclib': lid, 'counts': [len(l) for l in lines], 'sentences': sents}, open(f'{out_dir}/lyrics-{key}.json', 'w'), separators=(',', ':'))
        shown = sum(len(s['words']) for s in sents)
        print(f'{key}: whisper words {len(words)}, matched {len(matches)}, sentences {len(sents)}, words shown {shown}, lrc lines {len(lines)}, first {sents[0]["t0"] if sents else None}, last {sents[-1]["t1"] if sents else None}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

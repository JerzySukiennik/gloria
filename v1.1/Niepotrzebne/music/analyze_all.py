import json, subprocess, numpy as np, librosa, sys
tracks = {'techno': ('kandydaci/2-ameno-techno-gabry-ponte.wav', 149.1, 130), 'psy': ('kandydaci/3-ameno-psytrance.wav', 277.6, 145), 'yes': ('kandydaci/7-killer-mike-yes.wav', 176.2, 95)}
A = '/Users/jurek/Downloads/Claude/Projects/Gloria/assets/'
for key, (src, end, bpm0) in tracks.items():
    cut = f'/tmp/glo_{key}.wav'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-t',str(end),'-i',src,'-af',f'afade=t=out:st={end-2.5}:d=2.5,loudnorm=I=-14:TP=-1.5:LRA=11','-ar','44100',cut],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',cut,'-c:a','libmp3lame','-b:a','160k',A+f'audio/song-{key}.mp3'],check=True)
    y, sr = librosa.load(cut, sr=22050, mono=True)
    hop = 512
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, start_bpm=bpm0, tightness=140)
    bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
    k = np.arange(len(bt))
    T, t0 = np.linalg.lstsq(np.vstack([k, np.ones_like(k)]).T, bt, rcond=None)[0]
    res = bt - (t0 + T * k)
    ot = librosa.times_like(oenv, sr=sr, hop_length=hop)
    def score(TT, tt):
        g = tt + TT * np.arange(int((end - 2 - tt) / TT))
        return np.interp(g, ot, oenv).mean()
    bestS = -1
    for TT in T * (1 + np.linspace(-0.004, 0.004, 17)):
        for tt in t0 + np.linspace(-TT / 2, TT / 2, 41):
            sc = score(TT, tt)
            if sc > bestS: bestS, bT, bt0 = sc, TT, tt
    T, t0 = bT, bt0
    while t0 - T > 0.3: t0 -= T
    n = int((end - 1.5 - t0) / T)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    S = np.abs(librosa.stft(y, hop_length=hop, n_fft=2048)); fr = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[fr < 150].mean(axis=0)
    def at(arr, a, b):
        fa, fb = librosa.time_to_frames([a, b], sr=sr, hop_length=hop)
        return float(arr[fa:max(fa + 1, fb)].mean())
    P = np.array([[at(rms, t0 + i * T, t0 + (i + 1) * T), at(low, t0 + i * T, t0 + (i + 1) * T), at(oenv, t0 + i * T - 0.03, t0 + i * T + 0.05)] for i in range(n)])
    for c in range(3):
        v = P[:, c]; P[:, c] = np.clip((v - np.percentile(v, 5)) / (np.percentile(v, 95) - np.percentile(v, 5) + 1e-9), 0, 1)
    sm = np.convolve(P[:, 0], np.ones(8) / 8, mode='same')
    bars = ['low' if sm[i:i + 4].mean() < 0.36 else 'mid' if sm[i:i + 4].mean() < 0.62 else 'high' for i in range(0, n, 4)]
    best = None
    i = int(len(bars) * 0.3)
    while i < int(len(bars) * 0.86):
        if bars[i] == 'low':
            j = i
            while j + 1 < len(bars) and bars[j + 1] == 'low': j += 1
            if j - i >= 3 and (best is None or j - i > best[1] - best[0]): best = (i, j)
            i = j + 1
        else: i += 1
    win = int(20 / T)
    e = P[:, 0]
    pi = max(range(0, max(1, n - win)), key=lambda s: e[s:s + win].mean())
    prev = t0 + pi * T
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(prev),'-t','20','-i',cut,'-af','afade=t=in:d=0.6,afade=t=out:st=18.5:d=1.5','-ac','2','-c:a','libmp3lame','-b:a','128k',A+f'audio/preview-{key}.mp3'],check=True)
    out = {'T': round(float(T), 5), 't0': round(float(t0), 4), 'n': n, 'end': round(end - 2.0, 2), 'breakdown': list(best) if best else None, 'preview': round(prev, 2),
           'e': [round(float(x), 2) for x in P[:, 0]], 'k': [round(float(x), 2) for x in P[:, 1]], 'o': [round(float(x), 2) for x in P[:, 2]], 'bars': bars}
    json.dump(out, open(A + f'song-{key}.json', 'w'), separators=(',', ':'))
    print(key, 'bpm', round(60 / T, 2), 'librosa', round(float(np.atleast_1d(tempo)[0]), 1), 't0', round(t0, 2), 'resid std ms', round(res.std() * 1000, 1), 'bars', len(bars), 'breakdown', best, 'preview', round(prev, 1))
    print('   ', ''.join({'low': '.', 'mid': '-', 'high': '#'}[b] for b in bars))

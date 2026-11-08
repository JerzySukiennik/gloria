import json, numpy as np, librosa
y, sr = librosa.load('ameno_cut.wav', sr=22050, mono=True)
hop = 512
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, start_bpm=125, tightness=120)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
tempo = float(np.atleast_1d(tempo)[0])
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
S = np.abs(librosa.stft(y, hop_length=hop, n_fft=2048))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[freqs < 150].mean(axis=0)
hi = S[freqs > 4000].mean(axis=0)
def at(arr, t0, t1):
    a, b = librosa.time_to_frames([t0, t1], sr=sr, hop_length=hop)
    return float(arr[a:max(a + 1, b)].mean())
per = []
for i, t in enumerate(bt):
    t1 = bt[i + 1] if i + 1 < len(bt) else t + 60 / tempo
    per.append([round(float(t), 3), at(rms, t, t1), at(low, t, t1), at(hi, t, t1), at(oenv, t - 0.03, t + 0.05)])
P = np.array(per)
for k in (1, 2, 3, 4):
    v = P[:, k]; P[:, k] = (v - np.percentile(v, 5)) / (np.percentile(v, 95) - np.percentile(v, 5) + 1e-9)
P[:, 1:] = np.clip(P[:, 1:], 0, 1)
ibi = np.diff(bt)
print('tempo', round(tempo, 2), 'beats', len(bt), 'first', bt[:4].round(3), 'ibi median', round(float(np.median(ibi)), 4), 'ibi std', round(float(np.std(ibi)), 4))
best, bestS = 0, -1
for ph in range(4):
    s = P[ph::4, 4].mean() + P[ph::4, 2].mean()
    if s > bestS: best, bestS = ph, s
print('downbeat phase', best)
json.dump({'tempo': round(tempo, 3), 'down': best, 'beats': [[round(r[0], 3), round(r[1], 3), round(r[2], 3), round(r[3], 3), round(r[4], 3)] for r in P.tolist()]}, open('ameno_raw.json', 'w'))
e = P[:, 1]
bars = [float(e[i:i + 4].mean()) for i in range(best, len(e), 4)]
for i in range(0, len(bars), 8):
    print(f"bar {i:3d} t={P[best + i * 4, 0]:6.1f}s  " + ' '.join(f"{b:.2f}" for b in bars[i:i + 8]))

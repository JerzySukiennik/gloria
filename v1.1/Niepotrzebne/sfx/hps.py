import sys, numpy as np
from pitch import load
for fn in sys.argv[1:]:
    x, sr = load(fn, start=0.4, dur=2.0)
    n = 1 << 17
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)), n))
    fr = np.fft.rfftfreq(n, 1/sr)
    m = (fr > 25) & (fr < 2000)
    peaks = []
    Xm = X.copy()
    for _ in range(6):
        k = np.argmax(np.where(m, Xm, 0)); peaks.append(fr[k]); Xm[max(0,k-30):k+30] = 0
    hps = X.copy()
    for h in (2, 3, 4):
        d = X[::h]; hps[:len(d)] *= d
    k = np.argmax(np.where((fr > 30) & (fr < 800), hps, 0))
    f = fr[k]; midi = 69 + 12*np.log2(f/440)
    print(f'{fn:34s} HPS f0={f:7.1f} midi={midi:6.2f}  top peaks={[round(p,1) for p in sorted(peaks)]}')

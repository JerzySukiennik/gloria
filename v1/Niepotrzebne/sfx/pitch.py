import sys, subprocess, numpy as np
def load(fn, sr=44100, start=0.1, dur=1.2):
    raw = subprocess.run(['ffmpeg','-loglevel','error','-ss',str(start),'-t',str(dur),'-i',fn,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(raw, np.float32), sr
def f0(x, sr, fmin=40, fmax=1200):
    x = x - x.mean(); n = len(x)
    X = np.fft.rfft(x * np.hanning(n), 2*n); ac = np.fft.irfft(np.abs(X)**2)[:n]
    ac /= ac[0] + 1e-9
    lo, hi = int(sr/fmax), int(sr/fmin)
    k = lo + np.argmax(ac[lo:hi]); return sr / k, ac[k]
for fn in sys.argv[1:]:
    st = 0.3 if 'bass' not in fn else 0.05
    x, sr = load(fn, start=st)
    f, c = f0(x, sr)
    midi = 69 + 12*np.log2(f/440)
    print(f'{fn:40s} f0={f:7.1f} Hz midi={midi:6.2f} conf={c:.2f}')

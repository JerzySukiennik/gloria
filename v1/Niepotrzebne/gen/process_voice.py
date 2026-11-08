import json, subprocess, os, random, glob
OUT = '../../assets/voice/'
os.makedirs(OUT, exist_ok=True)
spec = json.load(open('lines.json'))
random.seed(11)
trim = 'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-48dB,areverse'
for key, (kind, style, text) in spec['lines'].items():
    if kind == 'p':
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'voice/{key}.wav','-af',f'{trim},highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.05','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','80k',OUT+key+'.mp3'],check=True)
    else:
        files = sorted(glob.glob(f'voice/{key}__*.wav'))
        ins, chains, labels = [], [], []
        n = 0
        for f in files:
            for rep in range(2):
                ins += ['-i', f]
                d = random.randint(0, 160 if rep == 0 else 260)
                rate = 24000 * (1 + random.uniform(-0.05, 0.05))
                pan = random.uniform(-0.8, 0.8)
                l, r = (1 - pan) / 2 + 0.25, (1 + pan) / 2 + 0.25
                vol = random.uniform(0.55, 1.0)
                chains.append(f'[{n}:a]{trim},asetrate={rate:.0f},aresample=44100,adelay={d}|{d},volume={vol:.2f},pan=stereo|c0={l:.2f}*c0|c1={r:.2f}*c0[v{n}]')
                labels.append(f'[v{n}]')
                n += 1
        fc = ';'.join(chains) + f";{''.join(labels)}amix=inputs={n}:normalize=0,highpass=f=90,loudnorm=I=-18:TP=-2[out]"
        subprocess.run(['ffmpeg','-y','-loglevel','error',*ins,'-filter_complex',fc,'-map','[out]','-ar','44100','-c:a','libmp3lame','-b:a','112k',OUT+key+'.mp3'],check=True)
    d = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',OUT+key+'.mp3'],capture_output=True,text=True).stdout.strip()
    print(key, d)

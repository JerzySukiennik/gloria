import json, subprocess, os, glob
OUT = '../../assets/audio/'
os.makedirs(OUT, exist_ok=True)
plan = {
 'kick':     dict(dur=0.45, trim=True, mono=True, peak=-1),
 'clap':     dict(dur=0.7,  trim=True, mono=False, peak=-2),
 'hat':      dict(dur=0.17, trim=True, mono=True, peak=-3),
 'ohat':     dict(dur=0.9,  trim=True, mono=True, peak=-3),
 'organC4':  dict(start=0.0, dur=6.0, fade=1.2, trim=True, peak=-1, name='organ48'),
 'organF4':  dict(start=0.0, dur=6.0, fade=1.2, trim=True, peak=-1, name='organ54'),
 'organqC4': dict(start=0.0, dur=7.0, fade=1.5, trim=True, peak=-1, name='organq60'),
 'organqDs4':dict(start=0.0, dur=7.0, fade=1.5, trim=True, peak=-1, name='organq63'),
 'choir':    dict(dur=7.4, fade=1.0, trim=True, peak=-1),
 'crowdsing':dict(dur=8.2, fade=1.0, trim=True, peak=-1),
 'ooh':      dict(dur=8.5, fade=1.0, trim=True, peak=-1),
 'choirstab':dict(dur=2.37, fade=0.5, trim=True, peak=-1),
 'bass':     dict(dur=2.5, fade=0.4, trim=True, mono=True, peak=-1),
 'bell':     dict(start=0.0, dur=14.0, fade=3.0, trim=True, mono=True, peak=-2),
 'sanctus':  dict(dur=1.93, fade=0.3, trim=True, peak=-2),
 'censer':   dict(dur=3.4, fade=0.4, trim=True, peak=-3),
 'cheer':    dict(dur=8.38, fade=1.5, peak=-2),
 'applause': dict(dur=10.3, fade=2.0, peak=-2),
 'chatter':  dict(dur=23.3, loudnorm=-30, loop=True),
 'room':     dict(dur=12.9, loudnorm=-34, loop=True),
 'walla':    dict(dur=28.0, loudnorm=-30, loop=True),
 'ir':       dict(dur=3.0, peak=-1, keepwav=True),
 'riser':    dict(dur=7.39, fade=0.2, peak=-2),
 'drop':     dict(dur=4.8, fade=0.8, peak=-1),
}
credits = json.load(open('credits.json'))
for stem, o in plan.items():
    src = glob.glob(f'raw/{stem}__*.ogg')[0]
    name = o.get('name', stem)
    af = []
    if o.get('trim'): af.append('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0')
    af.append(f"atrim=0:{o['dur']}")
    if o.get('fade'): af.append(f"afade=t=out:st={max(0,o['dur']-o['fade'])}:d={o['fade']}")
    if o.get('loudnorm'): af.append(f"loudnorm=I={o['loudnorm']}:TP=-6:LRA=11")
    ss = ['-ss', str(o.get('start', 0))] if o.get('start') else []
    tmp = f'/tmp/gl_{name}.wav'
    subprocess.run(['ffmpeg','-y','-loglevel','error',*ss,'-i',src,'-af',','.join(af),'-ar','44100',*(['-ac','1'] if o.get('mono') else ['-ac','2']),tmp],check=True)
    if o.get('peak') is not None:
        vol = subprocess.run(['ffmpeg','-i',tmp,'-af','volumedetect','-f','null','-'],capture_output=True,text=True).stderr
        mx = float(vol.split('max_volume:')[1].split('dB')[0])
        g = o['peak'] - mx
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',tmp,'-af',f'volume={g}dB',tmp+'.n.wav'],check=True); os.replace(tmp+'.n.wav', tmp)
    if o.get('keepwav'):
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',tmp,'-ar','44100',OUT+name+'.wav'],check=True)
    else:
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',tmp,'-c:a','libmp3lame','-b:a','128k' if not o.get('mono') else '96k',OUT+name+'.mp3'],check=True)
    os.remove(tmp)
    print(name, credits[stem]['id'])

import json, base64, os, time, subprocess
from gem import gemini
MODEL = 'gemini-2.5-flash-preview-tts'
spec = json.load(open('lines.json'))
os.makedirs('voice', exist_ok=True)
def tts(voice, prompt, out):
    if os.path.exists(out): return
    r = gemini(f'models/{MODEL}:generateContent', {"contents": [{"parts": [{"text": prompt}]}],
      "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}})
    p = r['candidates'][0]['content']['parts'][0]['inlineData']
    d = base64.b64decode(p['data'])
    if 'wav' in p['mimeType']: open(out, 'wb').write(d)
    else:
        open(out + '.pcm', 'wb').write(d)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar','24000','-ac','1','-i',out+'.pcm',out],check=True)
        os.remove(out + '.pcm')
    print('ok', out, flush=True)
    time.sleep(4)
for key, (kind, style, text) in spec['lines'].items():
    for attempt in range(3):
        try:
            if kind == 'p': tts(spec['priest_voice'], f"Say {style}: {text}", f'voice/{key}.wav')
            else:
                for v in spec['crowd_voices']: tts(v, f"Say {style}: {text}", f'voice/{key}__{v}.wav')
            break
        except Exception as e:
            print('ERR', key, str(e)[:200].replace('\n', ' '), flush=True)
            time.sleep(30)
print('DONE')

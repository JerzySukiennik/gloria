import json, base64, sys
from gem import gemini
model = 'gemini-2.5-flash'
files = sys.argv[1:]
for f in files:
    data = base64.b64encode(open(f, 'rb').read()).decode()
    r = gemini(f'models/{model}:generateContent', {"contents": [{"parts": [
        {"inlineData": {"mimeType": "audio/wav", "data": data}},
        {"text": "Transcribe exactly what is said (verbatim, in the original language). Then on a new line rate 1-10: does it sound like a native Polish speaker, natural intonation, any mispronounced words? Then one line: speaker gender/age impression and emotional tone. Be brief and strict."}]}]})
    print('##', f); print(r['candidates'][0]['content']['parts'][0]['text'].strip())

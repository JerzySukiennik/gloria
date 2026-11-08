import base64, sys
from gem import gemini
f, prompt = sys.argv[1], sys.argv[2]
data = base64.b64encode(open(f, 'rb').read()).decode()
r = gemini('models/gemini-2.5-flash:generateContent', {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": data}}, {"text": prompt}]}]})
print(r['candidates'][0]['content']['parts'][0]['text'].strip())

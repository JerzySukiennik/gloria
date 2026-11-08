import base64, sys, json
from gem import gemini
for f in sys.argv[1:]:
    data = base64.b64encode(open(f, 'rb').read()).decode()
    r = gemini('models/gemini-2.5-flash:generateContent', {"contents": [{"parts": [
        {"inlineData": {"mimeType": "audio/wav", "data": data}},
        {"text": "Transcribe verbatim everything spoken, with rough start/end seconds for each sentence, e.g. [0.0-1.2] text. Mark long silences as [silence a-b]. Output only that."}]}],
        "generationConfig": {"thinkingConfig": {"thinkingBudget": 0}}})
    print('##', f, '\n', r['candidates'][0]['content']['parts'][0]['text'].strip()[:600])

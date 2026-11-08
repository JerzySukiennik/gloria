import os, json, time, urllib.request, urllib.error
KEYS = [k for k in os.environ.get("GEMINI_API_KEYS", os.environ.get("GEMINI_API_KEY", "")).split(",") if k]
def gemini(path, body=None, rounds=2, timeout=300):
    last = None
    for i in range(rounds * len(KEYS)):
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/{path}",
                                     data=json.dumps(body).encode() if body else None,
                                     headers={"x-goog-api-key": KEYS[i % len(KEYS)], "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            text = e.read().decode(errors="ignore")
            if e.code not in (400, 401, 403, 429) or (e.code == 400 and "API key" not in text and "API_KEY" not in text):
                raise RuntimeError(f"{e.code} {text[:800]}")
            last = RuntimeError(f"{e.code} {text[:300]}")
            if i % len(KEYS) == len(KEYS) - 1:
                time.sleep(5)
    raise last

import time
import requests

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "phi3:mini"  # make sure this exists in `ollama list`

def query_ollama(prompt: str) -> str:
    """
    Always try to get an answer from Ollama.
    - Retries forever (or until it succeeds)
    - Uses a very large timeout per request (None means no timeout in requests)
    """
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.3}
    }

    attempt = 0
    while True:
        attempt += 1
        try:
            r = requests.post(OLLAMA_URL, json=payload, timeout=None)
            r.raise_for_status()
            data = r.json()

            # Ollama /api/chat returns {"message": {"content": "..."}}
            content = (data.get("message") or {}).get("content", "")
            content = content.strip()

            if not content:
                raise RuntimeError("Ollama returned empty content")

            return content

        except Exception as e:
            # DO NOT fallback to static text; keep retrying.
            print(f"[ollama] attempt {attempt} failed: {repr(e)}")
            time.sleep(min(2 * attempt, 10))  # backoff up to 10s

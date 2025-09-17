# Synapse Canvas (Prototype)

An infinite canvas chat prototype. Double-click to create a user node with an input box and a send button. On submit, the backend calls an LLM and renders an AI node next to it.

## Features (current)
- Double-click canvas to create a user node
- Submit to `/api/ask` and render AI response node
- FastAPI backend, static HTML/JS frontend

## Setup
```bash
python3 -m venv venv
./venv/bin/python -m pip install -U pip
./venv/bin/python -m pip install -r requirements.txt
```

## Tests
```bash
./venv/bin/python -m pytest -q
```

## Run
```bash
export OPENAI_API_KEY=sk-your-key
./venv/bin/python -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000

## Notes
- Never commit API keys. `.env` and `venv/` are ignored.
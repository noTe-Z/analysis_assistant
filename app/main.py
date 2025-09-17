import json
import os
import sys
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


def _log_debug(message: str, **kwargs: Dict[str, Any]) -> None:
    payload = {"message": message, **kwargs}
    print(json.dumps(payload, ensure_ascii=False), file=sys.stderr)


def create_app() -> FastAPI:
    app = FastAPI()

    static_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(static_dir, exist_ok=True)
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", response_class=HTMLResponse)
    def read_index() -> Any:
        index_path = os.path.join(static_dir, "index.html")
        if not os.path.exists(index_path):
            # Minimal placeholder to satisfy initial tests if file not created yet
            return "<!doctype html><html><head><meta charset='utf-8'></head><body>Index</body></html>"
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()

    @app.post("/api/ask")
    def ask(req: AskRequest) -> Dict[str, str]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

        try:
            from openai import OpenAI  # import here for test monkeypatching

            client = OpenAI()
            _log_debug("calling_openai_responses", model="gpt-5-mini")
            resp = client.responses.create(model="gpt-5-mini", input=req.question)
            text = getattr(resp, "output_text", None)
            if not text:
                # Fallback if SDK returns a different shape
                text = str(resp)
            return {"answer": text}
        except Exception as e:  # noqa: BLE001
            _log_debug("openai_error", error=str(e))
            raise HTTPException(status_code=502, detail="Upstream model error") from e

    return app


app = create_app()



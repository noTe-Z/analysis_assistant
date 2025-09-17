import os
import types
import pytest


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    # Ensure an API key is present so the app does not fail on startup checks
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


class _FakeResponse:
    def __init__(self, text: str):
        self.output_text = text


class _FakeClient:
    def __init__(self, *args, **kwargs):
        self._calls = []

        class _Responses:
            def __init__(self, outer):
                self._outer = outer

            def create(self, **kwargs):
                self._outer._calls.append(kwargs)
                # Echo back simple text for testing
                return _FakeResponse("hello from gpt-5-mini")

        self.responses = _Responses(self)


def test_post_api_ask(monkeypatch):
    # Lazy import after monkeypatching
    from importlib import reload

    # Patch OpenAI client constructor to use fake client
    import openai as _openai_pkg

    # openai.OpenAI exists in openai>=1.x
    monkeypatch.setattr(_openai_pkg, "OpenAI", _FakeClient, raising=True)

    # Create app after patch
    import app.main as app_main
    reload(app_main)

    from fastapi.testclient import TestClient

    client = TestClient(app_main.app)

    payload = {"question": "What is 2+2?"}
    r = client.post("/api/ask", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data
    assert data["answer"] == "hello from gpt-5-mini"

    # Validate minimal schema errors
    r2 = client.post("/api/ask", json={})
    assert r2.status_code == 422



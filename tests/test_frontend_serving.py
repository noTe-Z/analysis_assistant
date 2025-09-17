import os
import pytest


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


def test_index_served():
    from importlib import reload
    import app.main as app_main
    reload(app_main)

    from fastapi.testclient import TestClient
    client = TestClient(app_main.app)

    r = client.get("/")
    assert r.status_code == 200
    assert "<!doctype html".lower() in r.text.lower()


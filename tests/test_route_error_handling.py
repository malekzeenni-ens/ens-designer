"""
Regression tests for B2.3-B2.5: routes must not leak a raw 500 for unexpected
(non-ValueError) engine failures. They must be caught and converted to a
structured 400 response with logging, same as the existing ValueError path.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def _client_with_broken_service(monkeypatch, service_name: str) -> TestClient:
    app = create_app()
    service = getattr(app.state, service_name)

    def _boom(*args, **kwargs):
        raise AttributeError("simulated unexpected engine failure")

    monkeypatch.setattr(service, "generate", _boom)
    return TestClient(app)


def test_cake_topper_route_returns_400_not_500_on_unexpected_error(monkeypatch) -> None:
    client = _client_with_broken_service(monkeypatch, "cake_topper_service")
    response = client.post("/api/cake-topper", json={"text": "Hi", "default_font_id": "anything"})
    assert response.status_code == 400
    assert "detail" in response.json()


def test_generation_route_returns_400_not_500_on_unexpected_error(monkeypatch) -> None:
    client = _client_with_broken_service(monkeypatch, "generation_service")
    response = client.post("/api/generate", json={"text": "Hi", "font_id": "anything"})
    assert response.status_code == 400
    assert "detail" in response.json()


def test_overlap_route_returns_400_not_500_on_unexpected_error(monkeypatch) -> None:
    client = _client_with_broken_service(monkeypatch, "overlap_service")
    response = client.post("/api/overlap", json={"text": "Hi", "font_id": "anything"})
    assert response.status_code == 400
    assert "detail" in response.json()

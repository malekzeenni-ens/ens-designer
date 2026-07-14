from __future__ import annotations

import re
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import PROJECT_ROOT, create_app


def _fake_frontend(tmp_path: Path) -> Path:
    frontend_dist = tmp_path / "dist"
    assets = frontend_dist / "assets"
    assets.mkdir(parents=True)
    (frontend_dist / "index.html").write_text(
        '<!doctype html><div id="root"></div><script src="/assets/app.js"></script>',
        encoding="utf-8",
    )
    (assets / "app.js").write_text("window.ensDesigner = true;", encoding="utf-8")
    return frontend_dist


def test_healthcheck_identifies_the_application() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "ens-designer"}


def test_production_frontend_and_its_compiled_asset_are_served(tmp_path: Path) -> None:
    frontend_dist = _fake_frontend(tmp_path)

    with TestClient(create_app(frontend_dist=frontend_dist)) as client:
        page = client.get("/")
        assert page.status_code == 200
        assert page.headers["content-type"].startswith("text/html")

        asset_match = re.search(r'(?:src|href)="(/assets/[^"]+)"', page.text)
        assert asset_match is not None
        asset = client.get(asset_match.group(1))

    assert asset.status_code == 200
    assert asset.content


def test_api_routes_take_precedence_over_the_frontend_mount(tmp_path: Path) -> None:
    frontend_dist = _fake_frontend(tmp_path)

    with TestClient(create_app(frontend_dist=frontend_dist)) as client:
        response = client.get("/api/presets")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_missing_frontend_returns_an_actionable_error(tmp_path: Path) -> None:
    missing_dist = tmp_path / "frontend" / "dist"
    app = create_app(project_root=PROJECT_ROOT, frontend_dist=missing_dist)

    with TestClient(app) as client:
        response = client.get("/")
        health = client.get("/healthz")

    assert response.status_code == 503
    assert response.json()["expected_path"] == str(missing_dist / "index.html")
    assert response.json()["build_command"] == "cd frontend; npm.cmd run build"
    assert health.status_code == 200

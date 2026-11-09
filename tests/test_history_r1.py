"""Code review R1 F5/F10: history writes are atomic and corruption-safe, and a
history failure never turns a successful Keychain export into an error."""
from __future__ import annotations

import json
import os
import threading
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.font_loader import FontCatalog
from app.history_store import HistoryStore, HistoryUnavailableError
from app.keychain_history import KeychainHistoryStore
from app.main import create_app
from app.models import HistoryEntryCreate, KeychainHistoryCreate

ROOT = Path(__file__).resolve().parents[1]


def entry(name="Sarah"):
    return HistoryEntryCreate(export_type="svg", filename=f"{name}.svg", full_text=name, lines=[])


def keychain_entry(name="Sarah"):
    return KeychainHistoryCreate(recipe={"text": name, "font_id": "project:font"}, filename=f"{name}.svg", width_mm=60, height_mm=20)


def data_path(root: Path, name="cake_topper_history.json") -> Path:
    return root / "backend" / "data" / name


@pytest.mark.parametrize("store_type,filename,make", [
    (HistoryStore, "cake_topper_history.json", entry),
    (KeychainHistoryStore, "keychain_history.json", keychain_entry),
])
def test_corrupt_file_is_preserved_and_replaced_with_valid_history(tmp_path, store_type, filename, make):
    path = data_path(tmp_path, filename)
    path.parent.mkdir(parents=True)
    original = b'[{"filename": "jo.svg", "export_type": "svg"'  # torn write
    path.write_bytes(original)
    store = store_type(tmp_path)
    store.add(make("Ali"))
    backups = list(path.parent.glob(f"{path.stem}.corrupt-*.json"))
    assert len(backups) == 1 and backups[0].read_bytes() == original
    data = json.loads(path.read_text(encoding="utf-8"))
    assert len(data) == 1 and data[0]["filename"] == "Ali.svg"


def test_non_list_json_is_treated_as_corrupt_not_overwritten(tmp_path):
    path = data_path(tmp_path)
    path.parent.mkdir(parents=True)
    path.write_text('{"not": "a list"}', encoding="utf-8")
    HistoryStore(tmp_path).add(entry())
    assert len(list(path.parent.glob("cake_topper_history.corrupt-*.json"))) == 1


def test_failed_replace_leaves_original_unchanged_and_raises(tmp_path, monkeypatch):
    store = HistoryStore(tmp_path)
    store.add(entry("Jo"))
    path = data_path(tmp_path)
    before = path.read_bytes()

    def locked(*args, **kwargs):
        raise PermissionError(32, "The process cannot access the file")

    monkeypatch.setattr("app.history_store.os.replace", locked)
    monkeypatch.setattr("app.history_store.RETRY_DELAY_S", 0)
    with pytest.raises(HistoryUnavailableError):
        store.add(entry("Ali"))
    assert path.read_bytes() == before
    assert [p.name for p in path.parent.iterdir()] == [path.name]  # temp file cleaned up


def test_unreadable_file_raises_and_does_not_write(tmp_path, monkeypatch):
    store = HistoryStore(tmp_path)
    store.add(entry("Jo"))
    path = data_path(tmp_path)
    before = path.read_bytes()
    real_open = Path.open

    def locked_open(self, mode="r", *args, **kwargs):
        if self == path and "r" in mode:
            raise PermissionError(13, "locked")
        return real_open(self, mode, *args, **kwargs)

    monkeypatch.setattr(Path, "open", locked_open)
    monkeypatch.setattr("app.history_store.RETRY_DELAY_S", 0)
    with pytest.raises(HistoryUnavailableError):
        store.add(entry("Ali"))
    monkeypatch.undo()
    assert path.read_bytes() == before


def test_missing_file_is_empty_history(tmp_path):
    assert HistoryStore(tmp_path).list() == []


@pytest.mark.parametrize("store_type,make", [(HistoryStore, entry), (KeychainHistoryStore, keychain_entry)])
def test_concurrent_adds_keep_every_entry(tmp_path, store_type, make):
    store = store_type(tmp_path)
    names = [f"Name{i}" for i in range(8)]
    start = threading.Barrier(len(names))

    def worker(name):
        start.wait()
        store.add(make(name))

    threads = [threading.Thread(target=worker, args=(n,)) for n in names]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(e.filename for e in store.list()) == sorted(f"{n}.svg" for n in names)


def test_list_reads_under_the_lock(tmp_path, monkeypatch):
    store = HistoryStore(tmp_path)
    seen = []
    real_read = store._read

    def spy():
        seen.append(store._lock.locked())
        return real_read()

    monkeypatch.setattr(store, "_read", spy)
    store.list()
    assert seen == [True]


@pytest.fixture()
def keychain_app(tmp_path):
    catalog = FontCatalog(ROOT)
    fonts = catalog.list_fonts()
    font_id = next(font.id for font in fonts if font.full_name == "Anton")
    app = create_app(project_root=tmp_path)
    app.state.keychain_service.font_catalog = catalog
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, app, {"text": "Sarah", "font_id": font_id}


def test_export_succeeds_when_history_cannot_be_saved(keychain_app):
    client, app, payload = keychain_app

    class Broken:
        def add(self, *_):
            raise HistoryUnavailableError("history file is locked")

    app.state.keychain_history_store = Broken()
    response = client.post("/api/keychain/export", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["files"] and data["history_saved"] is False
    assert any("history" in warning.lower() for warning in data["warnings"])


def test_export_reports_history_saved(keychain_app):
    client, _, payload = keychain_app
    data = client.post("/api/keychain/export", json=payload).json()
    assert data["history_saved"] is True and data["warnings"] == []


def test_unexpected_engine_error_is_500_with_generic_message(keychain_app):
    client, app, payload = keychain_app

    def explode(*_):
        raise RuntimeError("secret internals")

    app.state.keychain_service.generate = explode
    response = client.post("/api/keychain/preview", json=payload)
    assert response.status_code == 500
    assert "secret" not in response.text and response.json()["detail"] == "Keychain generation failed."


def test_value_error_stays_400(keychain_app):
    client, app, payload = keychain_app

    def invalid(*_):
        raise ValueError("Selected font cannot render this name.")

    app.state.keychain_service.generate = invalid
    response = client.post("/api/keychain/preview", json=payload)
    assert response.status_code == 400 and "cannot render" in response.json()["detail"]


def test_history_routes_return_503_when_history_unavailable(keychain_app):
    client, app, _ = keychain_app

    class Locked:
        def list(self):
            raise HistoryUnavailableError("locked")

        def add(self, *_):
            raise HistoryUnavailableError("locked")

    app.state.keychain_history_store = Locked()
    app.state.history_store = Locked()
    assert client.get("/api/keychain/history").status_code == 503
    assert client.get("/api/cake-topper/history").status_code == 503
    body = {"export_type": "svg", "filename": "jo.svg", "full_text": "Jo", "lines": []}
    assert client.post("/api/cake-topper/history", json=body).status_code == 503

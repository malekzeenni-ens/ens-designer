"""
Regression tests for B1.2: a single malformed entry in the history store
must not crash the whole GET — it must be skipped and logged, with valid
entries still returned.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.history_store import HistoryStore

VALID_ENTRY = {
    "export_type": "svg",
    "filename": "design.svg",
    "full_text": "Hello",
    "lines": [],
    "timestamp": "2026-06-21T00:00:00+00:00",
}

MALFORMED_ENTRY = {
    # missing required "export_type" and "filename"
    "full_text": "Broken",
    "timestamp": "2026-06-21T00:00:00+00:00",
}


def _write_history(project_root: Path, entries: list[dict]) -> None:
    path = project_root / "backend" / "data" / "cake_topper_history.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entries), encoding="utf-8")


def test_one_malformed_entry_does_not_crash_list(tmp_path: Path, caplog) -> None:
    _write_history(tmp_path, [VALID_ENTRY, MALFORMED_ENTRY])
    store = HistoryStore(tmp_path)

    with caplog.at_level("WARNING"):
        entries = store.list()

    assert len(entries) == 1
    assert entries[0].filename == "design.svg"
    assert any("malformed" in record.message for record in caplog.records)


def test_all_malformed_entries_return_empty_list_not_500(tmp_path: Path) -> None:
    _write_history(tmp_path, [MALFORMED_ENTRY, MALFORMED_ENTRY])
    store = HistoryStore(tmp_path)

    entries = store.list()

    assert entries == []

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .models import HistoryEntry, HistoryEntryCreate

MAX_ENTRIES = 500


class HistoryStore:
    """Append-only JSON-backed store for cake topper export history."""

    def __init__(self, project_root: Path) -> None:
        self._path = project_root / "backend" / "data" / "cake_topper_history.json"

    def _read(self) -> list[dict]:
        if not self._path.exists():
            return []
        try:
            with self._path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            return []
        return data if isinstance(data, list) else []

    def _write(self, entries: list[dict]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2)

    def add(self, entry: HistoryEntryCreate) -> HistoryEntry:
        full_entry = HistoryEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            **entry.model_dump(),
        )
        entries = self._read()
        entries.append(full_entry.model_dump())
        if len(entries) > MAX_ENTRIES:
            entries = entries[-MAX_ENTRIES:]
        self._write(entries)
        return full_entry

    def list(self) -> list[HistoryEntry]:
        entries = self._read()
        parsed = [HistoryEntry(**e) for e in entries]
        return list(reversed(parsed))

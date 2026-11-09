from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from pydantic import ValidationError

from .models import HistoryEntry, HistoryEntryCreate

logger = logging.getLogger(__name__)

MAX_ENTRIES = 500
RETRIES = 5
RETRY_DELAY_S = 0.05


class HistoryUnavailableError(RuntimeError):
    """The history file exists but cannot be read or replaced right now.

    Raised instead of guessing: the caller must not write, so a locked or
    partially synced file (Dropbox, antivirus) is never replaced with a
    near-empty list.
    """


class HistoryStore:
    """Append-only JSON-backed store for cake topper export history.

    Writes are atomic (sibling temp file, fsync, os.replace with retries).
    A corrupt file is moved aside to ``<name>.corrupt-<UTC>.json`` before a
    new list is started; old data is never overwritten in place. Reads and
    writes both happen under the store lock.
    """

    def __init__(self, project_root: Path, filename: str = "cake_topper_history.json") -> None:
        if not filename or Path(filename).name != filename or filename in {".", ".."}:
            raise ValueError("History filename must be a single filename.")
        self._path = project_root / "backend" / "data" / filename
        self._lock = threading.Lock()

    def _quarantine(self, reason: str) -> None:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        target = self._path.with_name(f"{self._path.stem}.corrupt-{stamp}.json")
        self._replace(self._path, target)
        logger.error("History file %s was unreadable (%s); preserved as %s and started a new history.",
                     self._path.name, reason, target.name)

    def _replace(self, source: Path, target: Path) -> None:
        for attempt in range(RETRIES):
            try:
                os.replace(source, target)
                return
            except PermissionError as exc:  # Windows sharing violation: retry briefly
                if attempt == RETRIES - 1:
                    raise HistoryUnavailableError(f"History file is locked: {exc}") from exc
                time.sleep(RETRY_DELAY_S * (attempt + 1))

    def _read(self) -> list[dict]:
        """Current entries. Call with the lock held."""
        for attempt in range(RETRIES):
            try:
                with self._path.open("r", encoding="utf-8") as f:
                    raw = f.read()
                break
            except FileNotFoundError:
                return []
            except OSError as exc:
                if attempt == RETRIES - 1:
                    raise HistoryUnavailableError(f"History file cannot be read: {exc}") from exc
                time.sleep(RETRY_DELAY_S * (attempt + 1))
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            self._quarantine(f"invalid JSON: {exc}")
            return []
        if not isinstance(data, list):
            self._quarantine("top-level value is not a list")
            return []
        return data

    def _write(self, entries: list[dict]) -> None:
        """Atomically replace the history file. Call with the lock held."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix=f".{self._path.name}.", suffix=".tmp", dir=self._path.parent)
        temp = Path(temp_name)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(entries, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            self._replace(temp, self._path)
        except BaseException:
            try:
                temp.unlink()
            except OSError:
                logger.warning("Could not remove temporary history file %s.", temp.name)
            raise

    def _append(self, record: dict) -> None:
        with self._lock:
            entries = self._read()
            entries.append(record)
            self._write(entries[-MAX_ENTRIES:])

    def _entries(self) -> list[dict]:
        with self._lock:
            return self._read()

    def add(self, entry: HistoryEntryCreate) -> HistoryEntry:
        full_entry = HistoryEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            **entry.model_dump(),
        )
        self._append(full_entry.model_dump())
        return full_entry

    def list(self) -> list[HistoryEntry]:
        entries = self._entries()
        parsed: list[HistoryEntry] = []
        skipped = 0
        for e in entries:
            try:
                parsed.append(HistoryEntry(**e))
            except (ValidationError, TypeError):
                skipped += 1
        if skipped:
            logger.warning("history store: skipped %d malformed entr%s", skipped, "y" if skipped == 1 else "ies")
        return list(reversed(parsed))

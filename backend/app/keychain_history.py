from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path

from pydantic import ValidationError

from .history_store import HistoryStore, MAX_ENTRIES
from .models import KeychainHistoryCreate, KeychainHistoryEntry

logger = logging.getLogger(__name__)


class KeychainHistoryStore(HistoryStore):
    def __init__(self, project_root: Path):
        super().__init__(project_root, filename="keychain_history.json")

    def add(self, entry: KeychainHistoryCreate) -> KeychainHistoryEntry:
        saved = KeychainHistoryEntry(timestamp=datetime.now(timezone.utc).isoformat(), **entry.model_dump())
        with self._lock:
            entries = self._read()
            entries.append(saved.model_dump())
            self._write(entries[-MAX_ENTRIES:])
        return saved

    def list(self) -> list[KeychainHistoryEntry]:
        with self._lock:
            entries = self._read()
        parsed = []
        for entry in reversed(entries):
            try:
                parsed.append(KeychainHistoryEntry.model_validate(entry))
            except (ValidationError, TypeError):
                logger.warning("Skipping malformed keychain history entry.")
        return parsed

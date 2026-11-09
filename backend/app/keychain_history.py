from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path

from pydantic import ValidationError

from .history_store import HistoryStore
from .models import KeychainHistoryCreate, KeychainHistoryEntry

logger = logging.getLogger(__name__)


class KeychainHistoryStore(HistoryStore):
    """Keychain history: same atomic, corruption-safe, locked file handling."""

    def __init__(self, project_root: Path):
        super().__init__(project_root, filename="keychain_history.json")

    def add(self, entry: KeychainHistoryCreate) -> KeychainHistoryEntry:
        saved = KeychainHistoryEntry(timestamp=datetime.now(timezone.utc).isoformat(), **entry.model_dump())
        self._append(saved.model_dump())
        return saved

    def list(self) -> list[KeychainHistoryEntry]:
        parsed = []
        for entry in reversed(self._entries()):
            try:
                parsed.append(KeychainHistoryEntry.model_validate(entry))
            except (ValidationError, TypeError):
                logger.warning("Skipping malformed keychain history entry.")
        return parsed

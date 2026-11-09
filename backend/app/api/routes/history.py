from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from ...history_store import HistoryUnavailableError
from ...models import HistoryEntry, HistoryEntryCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cake-topper/history", tags=["history"])
UNAVAILABLE = "History is temporarily unavailable. Try again."


@router.get("", response_model=list[HistoryEntry])
def list_history(request: Request) -> list[HistoryEntry]:
    try:
        return request.app.state.history_store.list()
    except HistoryUnavailableError as exc:
        logger.error("Cake topper history unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=UNAVAILABLE) from exc


@router.post("", response_model=HistoryEntry)
def add_history_entry(payload: HistoryEntryCreate, request: Request) -> HistoryEntry:
    try:
        return request.app.state.history_store.add(payload)
    except HistoryUnavailableError as exc:
        logger.error("Cake topper history unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=UNAVAILABLE) from exc

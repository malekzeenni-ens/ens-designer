from __future__ import annotations

from fastapi import APIRouter, Request

from ...models import HistoryEntry, HistoryEntryCreate

router = APIRouter(prefix="/api/cake-topper/history", tags=["history"])


@router.get("", response_model=list[HistoryEntry])
def list_history(request: Request) -> list[HistoryEntry]:
    return request.app.state.history_store.list()


@router.post("", response_model=HistoryEntry)
def add_history_entry(payload: HistoryEntryCreate, request: Request) -> HistoryEntry:
    return request.app.state.history_store.add(payload)

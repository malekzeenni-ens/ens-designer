from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from ...history_store import HistoryUnavailableError
from ...models import KeychainHistoryCreate, KeychainHistoryEntry, KeychainRequest, KeychainResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/keychain", tags=["keychain"])


def _generate(payload, request, quality):
    try:
        result = request.app.state.keychain_service.generate(payload.model_copy(update={"quality": quality}))
    except ValueError as exc:
        logger.warning("Keychain generation failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Keychain generation failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Keychain generation failed.") from exc
    if quality == "export":
        # The export endpoint stays the only history writer, but a history
        # failure must never turn a successful export into an error.
        try:
            request.app.state.keychain_history_store.add(KeychainHistoryCreate(
                recipe=result.recipe, filename=result.files[0].filename,
                width_mm=result.width_mm, height_mm=result.height_mm))
        except Exception as exc:
            logger.error("Keychain export succeeded but history was not saved: %s", exc, exc_info=True)
            result = result.model_copy(update={
                "history_saved": False,
                "warnings": [*result.warnings, "The file was exported but could not be saved to history."]})
    return result


@router.post("/preview", response_model=KeychainResponse)
def preview_keychain(payload: KeychainRequest, request: Request):
    return _generate(payload, request, "preview")


@router.post("/export", response_model=KeychainResponse)
def export_keychain(payload: KeychainRequest, request: Request):
    return _generate(payload, request, "export")


@router.get("/history", response_model=list[KeychainHistoryEntry])
def list_history(request: Request):
    try:
        return request.app.state.keychain_history_store.list()
    except HistoryUnavailableError as exc:
        logger.error("Keychain history unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="History is temporarily unavailable. Try again.") from exc


@router.post("/history", response_model=KeychainHistoryEntry)
def add_history(payload: KeychainHistoryCreate, request: Request):
    try:
        return request.app.state.keychain_history_store.add(payload)
    except HistoryUnavailableError as exc:
        logger.error("Keychain history unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="History is temporarily unavailable. Try again.") from exc

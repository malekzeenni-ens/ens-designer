from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from ...models import KeychainHistoryCreate, KeychainHistoryEntry, KeychainRequest, KeychainResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/keychain", tags=["keychain"])


def _generate(payload, request, quality):
    try:
        result = request.app.state.keychain_service.generate(payload.model_copy(update={"quality": quality}))
        if quality == "export":
            request.app.state.keychain_history_store.add(KeychainHistoryCreate(
                recipe=result.recipe, filename=result.files[0].filename,
                width_mm=result.width_mm, height_mm=result.height_mm))
        return result
    except ValueError as exc:
        logger.warning("Keychain generation failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Keychain generation failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Keychain generation failed.") from exc


@router.post("/preview", response_model=KeychainResponse)
def preview_keychain(payload: KeychainRequest, request: Request):
    return _generate(payload, request, "preview")


@router.post("/export", response_model=KeychainResponse)
def export_keychain(payload: KeychainRequest, request: Request):
    return _generate(payload, request, "export")


@router.get("/history", response_model=list[KeychainHistoryEntry])
def list_history(request: Request):
    return request.app.state.keychain_history_store.list()


@router.post("/history", response_model=KeychainHistoryEntry)
def add_history(payload: KeychainHistoryCreate, request: Request):
    return request.app.state.keychain_history_store.add(payload)

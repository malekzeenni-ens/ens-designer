from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from ...models import OverlapRequest, OverlapResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/overlap", tags=["overlap"])


@router.post("", response_model=OverlapResponse)
def generate_overlap(payload: OverlapRequest, request: Request) -> OverlapResponse:
    try:
        return request.app.state.overlap_service.generate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Overlap generation failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Overlap generation failed.") from exc

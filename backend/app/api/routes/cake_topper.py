from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from ...models import CakeTopperRequest, CakeTopperResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cake-topper", tags=["cake-topper"])


@router.post("", response_model=CakeTopperResponse)
def generate_cake_topper(payload: CakeTopperRequest, request: Request) -> CakeTopperResponse:
    try:
        return request.app.state.cake_topper_service.generate(payload)
    except ValueError as exc:
        logger.warning("Cake topper generation failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Cake topper generation failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Cake topper generation failed.") from exc

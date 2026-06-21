from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from ...models import GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/generate", tags=["generation"])


@router.post("", response_model=GenerateResponse)
def generate_design(payload: GenerateRequest, request: Request) -> GenerateResponse:
    try:
        return request.app.state.generation_service.generate(
            payload.text,
            payload.font_id,
            payload.material_id,
            payload.welding_enabled,
            payload.bridge_overrides or [],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Design generation failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Design generation failed.") from exc

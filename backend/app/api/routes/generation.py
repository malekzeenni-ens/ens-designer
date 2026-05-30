from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ...models import GenerateRequest, GenerateResponse

router = APIRouter(prefix="/api/generate", tags=["generation"])


@router.post("", response_model=GenerateResponse)
def generate_design(payload: GenerateRequest, request: Request) -> GenerateResponse:
    try:
        return request.app.state.generation_service.generate(payload.text, payload.font_id, payload.material_id, payload.welding_enabled)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

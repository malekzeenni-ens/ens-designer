from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ...models import OverlapRequest, OverlapResponse

router = APIRouter(prefix="/api/overlap", tags=["overlap"])


@router.post("", response_model=OverlapResponse)
def generate_overlap(payload: OverlapRequest, request: Request) -> OverlapResponse:
    try:
        return request.app.state.overlap_service.generate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

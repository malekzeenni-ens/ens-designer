from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ...models import CakeTopperRequest, CakeTopperResponse

router = APIRouter(prefix="/api/cake-topper", tags=["cake-topper"])


@router.post("", response_model=CakeTopperResponse)
def generate_cake_topper(payload: CakeTopperRequest, request: Request) -> CakeTopperResponse:
    try:
        return request.app.state.cake_topper_service.generate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

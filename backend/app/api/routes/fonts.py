from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/fonts", tags=["fonts"])


@router.get("")
def list_fonts(request: Request):
    return request.app.state.font_catalog.list_fonts()

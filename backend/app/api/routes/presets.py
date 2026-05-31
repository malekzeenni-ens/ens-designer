from __future__ import annotations

from fastapi import APIRouter

from ...models import Preset
from ...presets import list_presets

router = APIRouter()


@router.get("/api/presets", response_model=list[Preset])
def get_presets() -> list[Preset]:
    return list_presets()

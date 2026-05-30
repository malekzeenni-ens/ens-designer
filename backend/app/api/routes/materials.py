from __future__ import annotations

from fastapi import APIRouter

from ...material_profiles import list_materials

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("")
def materials():
    return list_materials()

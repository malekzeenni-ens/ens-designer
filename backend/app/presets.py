from __future__ import annotations

from .models import Preset

_PRESETS: list[Preset] = [
    Preset(
        preset_id="name-sign",
        preset_name="Name Sign",
        default_material_id="cast-acrylic-3mm",
        description="Standard personalised name sign. 3mm Cast Acrylic.",
    ),
    Preset(
        preset_id="cake-topper",
        preset_name="Cake Topper",
        default_material_id="cast-acrylic-3mm",
        description="Cake topper text. 3mm Cast Acrylic. Stake geometry added in Phase 2.",
    ),
    Preset(
        preset_id="ornament",
        preset_name="Ornament",
        default_material_id="mirror-acrylic-3mm",
        description="Decorative ornament. 3mm Mirror Acrylic.",
    ),
    Preset(
        preset_id="nursery-sign",
        preset_name="Nursery Sign",
        default_material_id="plywood-3mm",
        description="Nursery name sign. 3mm Plywood.",
    ),
]


def list_presets() -> list[Preset]:
    return _PRESETS


def get_preset(preset_id: str) -> Preset | None:
    return next((p for p in _PRESETS if p.preset_id == preset_id), None)

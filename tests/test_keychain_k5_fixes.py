"""K5 regression coverage: production-check fixes must change something and
measurably improve real geometry; ring drags must follow the snapped ring."""
from __future__ import annotations

import copy
from pathlib import Path

import pytest
from shapely.geometry import Point, box

from app.font_loader import FontCatalog
from app.keychain_engine import KeychainService
from app.keychain_validation import validate_keychain
from app.models import KeychainRequest, KeychainRingMetadata

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = "Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf"


@pytest.fixture(scope="module")
def service():
    catalog = FontCatalog(ROOT)
    catalog.list_fonts()
    return KeychainService(ROOT, catalog), catalog._read_font("project", ROOT / "fonts" / SCRIPT).info.id


def ring(**changes):
    base = dict(center_x_mm=0, center_y_mm=0, outer_diameter_mm=12, hole_diameter_mm=5, wall_thickness_mm=3.5,
                neck_width_mm=6, snapped=False, touching=True, hole_clearance_mm=2)
    return KeychainRingMetadata(**{**base, **changes})


def run(request, **changes):
    params = dict(request=request, backing=Point(0, 0).buffer(10), text=Point(30, 0).buffer(5),
                  ring=ring(), converged=True, minimum_mm=12, missing=[])
    params.update(changes)
    return {check.id: check for check in validate_keychain(**params)}


def apply(design: dict, fix: dict) -> dict:
    design = copy.deepcopy(design)
    if fix["action"] == "set":
        *path, last = fix["field"].split(".")
        target = design
        for key in path:
            target = target.setdefault(key, {})
        target[last] = fix["value"]
    else:
        assert fix["action"] == "snap_ring"
        design.setdefault("ring", {}).update(fix["value"])
    return design


def test_exhausted_fixes_are_replaced_by_explanations():
    request = KeychainRequest(text="Sarah", font_id="x", style="layered", stroke_buffer_mm=.6,
                              backing={"smoothing_mm": 3}, dots={"auto_join": True})
    thin = box(20, 0, 20.2, 20).union(Point(0, 12).buffer(.1))
    result = run(request, text=thin, backing=Point(0, 0).buffer(5).union(Point(0, 9).buffer(.2)).buffer(0))
    for identifier in ("KC-TEXT-MIN-STROKE", "KC-TEXT-FLOATING-PARTS"):
        assert result[identifier].severity == "warning"
        assert result[identifier].fix is None and result[identifier].fix_note
    result = run(request, backing=Point(0, 0).buffer(5).union(Point(0, 9).buffer(.2).buffer(0)))
    feature = result["KC-BACKING-MIN-FEATURE"]
    if feature.severity != "pass":
        assert feature.fix is None and "maximum" in feature.fix_note


def test_ring_snap_fix_is_never_a_no_op():
    snapping = KeychainRequest(text="Sarah", font_id="x")
    check = run(snapping, ring=ring(neck_width_mm=1))["KC-RING-NECK"]
    assert check.fix is None and "already on" in check.fix_note
    off = KeychainRequest(text="Sarah", font_id="x", ring={"auto_snap": False})
    assert run(off, ring=ring(neck_width_mm=1))["KC-RING-NECK"].fix == {"action": "snap_ring", "value": {"auto_snap": True}}
    moved = KeychainRequest(text="Sarah", font_id="x", ring={"x_offset_mm": 4})
    assert run(moved, ring=ring(touching=False))["KC-RING-TOUCH"].fix["value"] == {"auto_snap": True, "x_offset_mm": 0, "y_offset_mm": 0}


def test_fix_values_differ_from_current_settings():
    request = KeychainRequest(text="Sarah", font_id="x", style="layered", stroke_buffer_mm=.3, dots={"auto_join": False},
                              ring={"outer_diameter_mm": 10, "hole_diameter_mm": 5})
    result = run(request, text=Point(0, 0).buffer(5).union(Point(9, 0).buffer(.2)), ring=ring(wall_thickness_mm=2.5))
    assert result["KC-TEXT-MIN-STROKE"].severity == "pass" or result["KC-TEXT-MIN-STROKE"].fix["value"] > .3
    assert result["KC-TEXT-FLOATING-PARTS"].fix == {"action": "set", "field": "dots.auto_join", "value": True}
    assert result["KC-RING-WALL"].fix == {"action": "set", "field": "ring.outer_diameter_mm", "value": 11}


def test_unconverged_size_reports_the_achieved_value():
    check = run(KeychainRequest(text="Sarah", font_id="x"), converged=False)["KC-SIZE-CONVERGED"]
    assert "achieved 20.00 mm" in check.message and check.fix is None and check.fix_note


@pytest.mark.parametrize("ring_settings", [{"x_offset_mm": 6, "y_offset_mm": 9}, {"auto_snap": False, "x_offset_mm": -30}])
def test_ring_fixes_resolve_real_geometry(service, ring_settings):
    svc, font = service
    design = {"text": "Sarah", "font_id": font, "ring": ring_settings}
    failing = {c.id: c for c in svc.generate(KeychainRequest(**design)).checks if c.severity != "pass"}
    assert failing
    fix = next(c.fix for c in failing.values() if c.fix)
    fixed = svc.generate(KeychainRequest(**apply(design, fix)))
    assert all(check.severity == "pass" for check in fixed.checks)


def test_rebased_ring_drag_moves_a_snapped_ring_by_the_drag_distance(service):
    svc, font = service
    base = svc.generate(KeychainRequest(text="Sarah", font_id=font, ring={"position": "top-center"}))
    assert base.ring.snapped and base.ring.requested_center_x_mm is not None
    rebase = (base.ring.center_x_mm-base.ring.requested_center_x_mm, base.ring.center_y_mm-base.ring.requested_center_y_mm)
    for dx in (3, -3, 6):
        moved = svc.generate(KeychainRequest(text="Sarah", font_id=font, ring={
            "position": "top-center", "x_offset_mm": rebase[0]+dx, "y_offset_mm": rebase[1]}))
        anchor0, anchor1 = base.glyphs[0].bbox_mm[0], moved.glyphs[0].bbox_mm[0]
        travelled = (moved.ring.center_x_mm-anchor1)-(base.ring.center_x_mm-anchor0)
        assert travelled == pytest.approx(dx, abs=.05)

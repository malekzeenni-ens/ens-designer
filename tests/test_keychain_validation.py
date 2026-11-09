from shapely.geometry import Point, box
from shapely.ops import unary_union
import pytest

from app.keychain_validation import validate_keychain
from app.models import KeychainRequest, KeychainRingMetadata


def checks(**changes):
    request = KeychainRequest(text="Sarah", font_id="test", style="layered")
    ring = KeychainRingMetadata(center_x_mm=0, center_y_mm=0, outer_diameter_mm=12,
                               hole_diameter_mm=5, wall_thickness_mm=3.5, neck_width_mm=6,
                               snapped=False, touching=True, hole_clearance_mm=2)
    params = dict(request=request, backing=Point(0, 0).buffer(10), text=Point(0, 0).buffer(5),
                  ring=ring, converged=True, minimum_mm=12, missing=[])
    params.update(changes)
    return {check.id: check for check in validate_keychain(**params)}


def test_all_production_checks_have_a_passing_case():
    result = checks()
    assert len(result) == 11
    assert all(check.severity == "pass" and check.fix is None for check in result.values())


@pytest.mark.parametrize("identifier,changes,severity", [
    ("KC-BACKING-SINGLE-PIECE", {"backing": unary_union([Point(-20, 0).buffer(2), Point(20, 0).buffer(2)])}, "error"),
    ("KC-SIZE-MIN", {"minimum_mm": 70}, "error"),
    ("KC-BACKING-MIN-FEATURE", {"backing": Point(0, 0).buffer(5).union(box(-.1, 0, .1, 20))}, "warning"),
    ("KC-TEXT-FLOATING-PARTS", {"text": unary_union([Point(0, 0).buffer(5), Point(10, 0).buffer(.2)])}, "warning"),
    ("KC-TEXT-MIN-STROKE", {"text": box(0, 0, .2, 20)}, "warning"),
    ("KC-MISSING-GLYPHS", {"missing": ["🙂"]}, "warning"),
    ("KC-SIZE-CONVERGED", {"converged": False}, "warning"),
])
def test_non_ring_production_failures(identifier, changes, severity):
    assert checks(**changes)[identifier].severity == severity


@pytest.mark.parametrize("identifier,field,value,severity", [
    ("KC-RING-WALL", "wall_thickness_mm", 2, "warning"),
    ("KC-RING-NECK", "neck_width_mm", 2, "warning"),
    ("KC-RING-TOUCH", "touching", False, "error"),
    ("KC-HOLE-CLEARANCE", "hole_clearance_mm", 0, "warning"),
])
def test_ring_production_failures(identifier, field, value, severity):
    ring = KeychainRingMetadata(center_x_mm=0, center_y_mm=0, outer_diameter_mm=12,
                               hole_diameter_mm=5, wall_thickness_mm=3.5, neck_width_mm=6,
                               snapped=False, touching=True, hole_clearance_mm=2)
    check = checks(ring=ring.model_copy(update={field: value}))[identifier]
    assert check.severity == severity
    assert check.highlight_bbox_mm is not None


def test_disconnected_backing_suggests_smallest_half_mm_offset_that_merges():
    request = KeychainRequest(text="ab", font_id="test", backing={"offset_mm": 1})
    text = unary_union([Point(0, 0).buffer(1), Point(8, 0).buffer(1)])
    check = checks(request=request, text=text, backing=text.buffer(1), ring=None)["KC-BACKING-SINGLE-PIECE"]
    offset = check.fix["value"]
    assert text.buffer(offset).geom_type == "Polygon"
    assert text.buffer(offset-.5).geom_type == "MultiPolygon"

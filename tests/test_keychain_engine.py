from __future__ import annotations

from pathlib import Path

import pytest
from shapely import affinity
from shapely.geometry import box

from app.font_loader import FontCatalog
from app.keychain_engine import (KeychainService, attach_ring, fill_counters, make_backing,
                                 prepare_text, text_at, transform_path)
from app.models import KeychainRequest
from app.floating_component import _bounds, _split_subpaths, join_floating_components

ROOT = Path(__file__).resolve().parents[1]
FONT_FILES = {
    "script": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf",
    "display": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Anton/Anton-Regular.ttf",
    "serif": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Lora/static/Lora-Regular.ttf",
    "arabic": "Cairo/static/Cairo-Regular.ttf",
}


@pytest.fixture(scope="module")
def catalog():
    catalog = FontCatalog(ROOT)
    catalog.list_fonts()
    return catalog


@pytest.fixture(scope="module")
def fonts(catalog):
    return {role: catalog._read_font("project", ROOT / "fonts" / file).info.id for role, file in FONT_FILES.items()}


@pytest.fixture(scope="module")
def service(catalog):
    return KeychainService(ROOT, catalog)


@pytest.mark.parametrize("role", ["script", "display", "serif"])
@pytest.mark.parametrize("mode", ["width", "height"])
@pytest.mark.parametrize("target", [30, 60, 90])
def test_finished_size_and_uniform_scale(service, fonts, catalog, role, mode, target):
    request = KeychainRequest(text="Sarah", font_id=fonts[role], size={"mode": mode, "target_mm": target})
    result = service.generate(request)
    assert result.size_solve_converged, result.checks
    achieved = result.width_mm if mode == "width" else result.height_mm
    assert abs(achieved-target) <= .05
    prepared = prepare_text(request, catalog, {})
    text, _, _ = text_at(prepared, request, result.scale_applied)
    before, after = prepared.geometry.bounds, text.bounds
    assert (after[2]-after[0])/(after[3]-after[1]) == pytest.approx(
        (before[2]-before[0])/(before[3]-before[1]), rel=.001)


@pytest.mark.parametrize("letter", ["O", "B", "e"])
def test_fill_counters_is_optional_and_does_not_remove_keyhole(service, fonts, letter):
    result = service.generate(KeychainRequest(text=letter, font_id=fonts["display"], ring={"enabled": False}))
    request = KeychainRequest(text=letter, font_id=fonts["display"], ring={"enabled": False})
    prepared = prepare_text(request, service.font_catalog, {})
    text, _, _ = text_at(prepared, request, result.scale_applied)
    solid = make_backing(text, request)
    hollow = make_backing(text, request.model_copy(update={"backing": request.backing.model_copy(update={"fill_counters": False})}))
    assert len(solid.interiors) == 0
    assert sum(len(part.interiors) for part in getattr(hollow, "geoms", [hollow])) > 0
    body, ring = attach_ring(solid, text, request.ring.model_copy(update={"enabled": True}))
    assert ring.touching
    assert any(len(part.interiors) >= 1 for part in getattr(body, "geoms", [body]))


def test_smoothing_closes_notches_without_changing_straight_offset(fonts):
    request = KeychainRequest(text="S", font_id=fonts["display"], backing={"offset_mm": 1, "smoothing_mm": 1})
    text = box(0, 0, 20, 10).difference(box(9, 0, 11, 7))
    backing = make_backing(text, request)
    assert backing.bounds == pytest.approx((-1, -1, 21, 11), abs=.02)
    assert backing.covers(box(9.5, 0, 10.5, 5))


def test_too_small_height_returns_actionable_minimum(service, fonts):
    result = service.generate(KeychainRequest(text="Sarah", font_id=fonts["display"], size={"mode": "height", "target_mm": 10}))
    assert not result.size_solve_converged
    check = next(check for check in result.checks if check.id == "KC-SIZE-MIN")
    assert check.severity == "error"
    assert check.fix["field"] == "size.target_mm"
    assert check.fix["value"] >= 12


@pytest.mark.parametrize("position", ["top-left", "top-center", "top-right", "left-middle", "right-middle", "custom"])
def test_ring_snap_from_far_away_and_disabled_snap(service, fonts, position):
    request = KeychainRequest(text="Sarah", font_id=fonts["display"], ring={"position": position, "y_offset_mm": -30})
    result = service.generate(request)
    assert result.ring.snapped
    assert result.ring.touching
    assert result.ring.neck_width_mm >= 5
    unsnapped = service.generate(request.model_copy(update={"ring": request.ring.model_copy(update={"auto_snap": False})}))
    assert next(check for check in unsnapped.checks if check.id == "KC-RING-TOUCH").severity == "error"


@pytest.mark.parametrize("role", ["script", "display"])
@pytest.mark.parametrize("letter", ["i", "j"])
def test_dot_auto_join_and_manual_offset_after_join(fonts, catalog, role, letter):
    request = KeychainRequest(text=letter, font_id=fonts[role], dots={"auto_join": False})
    original = prepare_text(request, catalog, {})
    assert original.floating_glyphs == {0}
    path = original.paths[0]
    float_index = original.floats[path.path_id][0]
    joined = join_floating_components(original.paths, original.glyphs, 25, original.labels)[0]
    bounds = [_bounds(part) for part in _split_subpaths(joined.commands)]
    dot = bounds[float_index]
    main = max((bounds[i] for i in range(len(bounds)) if i != float_index), key=lambda b: (b[2]-b[0])*(b[3]-b[1]))
    assert dot[3]-main[1] == pytest.approx((dot[3]-dot[1])*.25, abs=.002)
    auto = request.model_copy(update={"dots": request.dots.model_copy(update={"auto_join": True})})
    prepared = prepare_text(auto, catalog, {})
    assert prepared.geometry.geom_type == "Polygon"
    assert all(body.intersects(dot) for _, body, dots in prepared.pieces.values() for dot in dots.values())
    baseline_geometry, baseline_paths, _ = text_at(prepared, auto, .5, include_paths=True)
    manual = KeychainRequest(**{**auto.model_dump(), "dots": {"auto_join": True, "manual_offsets": [{"glyph_index": 0, "x_offset_mm": 2, "y_offset_mm": -3}]}})
    moved_geometry, moved_paths, _ = text_at(prepared, manual, .5, include_paths=True)
    before = _bounds(_split_subpaths(baseline_paths[0].commands)[float_index])
    after = _bounds(_split_subpaths(moved_paths[0].commands)[float_index])
    assert after[0]-before[0] == pytest.approx(2, abs=.002)
    assert after[1]-before[1] == pytest.approx(-3, abs=.002)
    assert not baseline_geometry.equals(moved_geometry)


def test_per_glyph_transforms_preserve_curves_and_final_mm_offsets(fonts, catalog):
    request = KeychainRequest(text="Sarah", font_id=fonts["script"])
    prepared = prepare_text(request, catalog, {})
    for scale in (.2, .7):
        _, baseline, base_geometries = text_at(prepared, request, scale, include_paths=True)
        changed = KeychainRequest(**{**request.model_dump(), "glyph_transforms": [{"glyph_index": 0, "dx_mm": 2, "dy_mm": 3, "scale": 1.2, "rotation_deg": 30}]})
        _, paths, geometries = text_at(prepared, changed, scale, include_paths=True)
        assert [cmd.type for cmd in paths[0].commands] == [cmd.type for cmd in baseline[0].commands]
        assert any(cmd.type in ("Q", "C") for cmd in paths[0].commands)
        bounds = _bounds(baseline[0].commands)
        center = ((bounds[0]+bounds[2])/2, (bounds[1]+bounds[3])/2)
        expected = affinity.translate(affinity.rotate(affinity.scale(base_geometries[0], 1.2, 1.2, origin=center), 30, origin=center), 2, 3)
        assert expected.hausdorff_distance(geometries[0]) < 1e-8


def test_cluster_mapping_ligatures_and_arabic(service, fonts):
    for role, text in [("serif", "fifi"), ("arabic", "سارة")]:
        result = service.generate(KeychainRequest(text=text, font_id=fonts[role]))
        labels = [glyph.cluster_text for glyph in result.glyphs]
        assert all(label and "?" not in label for label in labels)
        assert sorted("".join(labels)) == sorted(text)
        if role == "serif":
            assert any(len(label) > 1 for label in labels)


def test_missing_and_wholly_unsupported_glyphs(service, fonts):
    result = service.generate(KeychainRequest(text="Sarah🙂", font_id=fonts["display"]))
    assert next(check for check in result.checks if check.id == "KC-MISSING-GLYPHS").severity == "warning"
    with pytest.raises(ValueError, match="cannot render"):
        service.generate(KeychainRequest(text="🙂", font_id=fonts["display"]))


def test_opposing_physical_offsets_do_not_create_a_false_minimum_size_error(service, fonts):
    request = KeychainRequest(text="IIII", font_id=fonts["display"], size={"target_mm": 90},
                              glyph_transforms=[{"glyph_index": 0, "dx_mm": 50}, {"glyph_index": 3, "dx_mm": -50}])
    result = service.generate(request)
    assert result.size_solve_converged
    assert result.width_mm == pytest.approx(90, abs=.05)
    assert next(check for check in result.checks if check.id == "KC-SIZE-MIN").severity == "pass"


def test_other_diacritics_are_not_moved_by_ij_dot_join(fonts, catalog):
    request = KeychainRequest(text="ë", font_id=fonts["serif"])
    auto = prepare_text(request, catalog, {})
    unchanged = prepare_text(request.model_copy(update={"dots": request.dots.model_copy(update={"auto_join": False})}), catalog, {})
    assert auto.paths == unchanged.paths


def test_concurrent_service_requests_are_deterministic(service, fonts):
    from concurrent.futures import ThreadPoolExecutor
    request = KeychainRequest(text="fifi", font_id=fonts["script"])
    expected = service.generate(request)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: service.generate(request), range(16)))
    assert all(result.preview_svg == expected.preview_svg and result.width_mm == expected.width_mm for result in results)

"""K1 regression coverage for reusable, behaviour-neutral foundations."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shutil
import threading

from fastapi.testclient import TestClient
import pytest
from shapely.geometry import Point
from shapely.geometry import box
from shapely import to_wkt

from app import font_cache
from app.font_cache import clear_font_cache, get_glyph_outline, get_loaded_font
from app.history_store import HistoryStore
from app.main import create_app
from app.models import CakeTopperRequest, GeometryPath, HistoryEntryCreate, PathCommand
from app.outline_extractor import extract_outlines
from app.shapely_converter import path_to_shapely
from app.text_shaper import shape_text
from app.ring_geometry import _apply_ring_to_base, _compound_paths_from_shapely

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "fonts/Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf"


@pytest.fixture(autouse=True)
def clean_cache():
    clear_font_cache()
    yield
    clear_font_cache()


def test_reuse_invalidation_clear_and_active_snapshot(tmp_path):
    path = tmp_path / "font.ttf"
    shutil.copyfile(FONT, path)
    first = get_loaded_font(path)
    assert get_loaded_font(path) is first
    stat = path.stat()
    os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))
    second = get_loaded_font(path)
    assert second is not first
    clear_font_cache()
    assert get_loaded_font(path) is not second
    # Clearing during an in-flight request must not close its font objects.
    assert shape_text("fifi", path, loaded=first) == shape_text("fifi", path)


def test_font_lru_eviction_keeps_active_snapshot_usable(tmp_path, monkeypatch):
    monkeypatch.setattr(font_cache, "MAX_FONTS", 2)
    paths = [tmp_path / f"{index}.ttf" for index in range(3)]
    for path in paths:
        shutil.copyfile(FONT, path)
    first, second = (get_loaded_font(path) for path in paths[:2])
    assert get_loaded_font(paths[0]) is first  # make second the least recently used
    get_loaded_font(paths[2])
    assert get_loaded_font(paths[0]) is first
    assert get_loaded_font(paths[1]) is not second
    assert shape_text("Sarah", paths[1], loaded=second)


def test_concurrent_cold_loads_share_one_font():
    barrier = threading.Barrier(8)

    def load(_):
        barrier.wait()
        return get_loaded_font(FONT)

    with ThreadPoolExecutor(max_workers=8) as pool:
        loaded = list(pool.map(load, range(8)))
    assert all(font is loaded[0] for font in loaded)


@pytest.mark.parametrize("relative,text", [
    ("Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf", "fifi Zoë"),
    ("Anton,League_Spartan,Lora,Quicksand,Satisfy/Anton/Anton-Regular.ttf", "Sarah"),
    ("Anton,League_Spartan,Lora,Quicksand,Satisfy/Lora/static/Lora-Regular.ttf", "Mr Bear"),
    ("Cairo/static/Cairo-Regular.ttf", "سارة"),
])
def test_cached_shaping_and_outlines_match_uncached_under_concurrency(relative, text):
    path = ROOT / "fonts" / relative
    shaped = shape_text(text, path)
    expected = extract_outlines(path, shaped)
    loaded = get_loaded_font(path)

    def render(_):
        actual_shaped = shape_text(text, path, loaded=loaded)
        assert actual_shaped == shaped
        return extract_outlines(path, actual_shaped, loaded=loaded)

    with ThreadPoolExecutor(max_workers=8) as pool:
        assert all(actual == expected for actual in pool.map(render, range(32)))


def test_raw_outline_cache_draws_once_and_returns_independent_commands(monkeypatch):
    loaded = get_loaded_font(FONT)
    glyph_name = shape_text("S", FONT, loaded=loaded)[0].glyph_name
    commands, closed = get_glyph_outline(loaded, glyph_name)
    original = [command.model_copy(deep=True) for command in commands]
    assert commands and closed
    # A cache hit must not touch the glyph set; callers may edit their copy.
    monkeypatch.setattr(type(loaded.glyph_set), "__getitem__", lambda *args: pytest.fail("Cache miss"))
    commands[0].x = 999999
    assert get_glyph_outline(loaded, glyph_name) == (original, closed)


def test_raw_outline_cache_is_bounded(monkeypatch):
    monkeypatch.setattr(font_cache, "MAX_GLYPHS_PER_FONT", 1)
    loaded = get_loaded_font(FONT)
    names = [glyph.glyph_name for glyph in shape_text("Sa", FONT, loaded=loaded)]
    for name in names:
        get_glyph_outline(loaded, name)
    assert list(loaded._outlines) == names[-1:]


def test_history_files_are_isolated(tmp_path):
    default = HistoryStore(tmp_path)
    separate = HistoryStore(tmp_path, filename="keychain_history.json")
    separate.add(HistoryEntryCreate(export_type="svg", filename="name.svg", full_text="Sarah", lines=[]))
    assert default.list() == []
    assert [entry.filename for entry in separate.list()] == ["name.svg"]
    assert not (tmp_path / "backend/data/cake_topper_history.json").exists()


def curve_path():
    return GeometryPath(path_id="curve", closed=True, commands=[
        PathCommand(type="M", x=0, y=0),
        PathCommand(type="Q", x1=50, y1=100, x=100, y=0),
        PathCommand(type="C", x1=100, y1=-30, x2=0, y2=-30, x=0, y=0),
        PathCommand(type="Z"),
    ])


def test_optional_curve_tolerance_improves_accuracy_without_changing_default():
    path = curve_path()
    default = path_to_shapely(path)
    assert default.equals_exact(path_to_shapely(path, tolerance_mm=None), 0)
    fine = path_to_shapely(path, tolerance_mm=.02)
    assert len(fine.exterior.coords) > len(default.exterior.coords)
    for index in range(101):
        t = index / 100
        quadratic = Point(100 * t, 200 * t * (1 - t))
        cubic = Point(100 * (1-t)**3 + 300 * (1-t)**2 * t, -90 * t * (1-t))
        assert fine.boundary.distance(quadratic) <= .02
        assert fine.boundary.distance(cubic) <= .02


@pytest.mark.parametrize("tolerance", [0, -1, float("nan"), float("inf")])
def test_invalid_curve_tolerance_rejected(tolerance):
    with pytest.raises(ValueError, match="tolerance"):
        path_to_shapely(curve_path(), tolerance_mm=tolerance)


@pytest.mark.parametrize("tolerance,steps", [(1e100, 4), (1e-320, 64)])
def test_curve_subdivision_is_bounded_even_for_extreme_tolerances(tolerance, steps):
    geometry = path_to_shapely(curve_path(), tolerance_mm=tolerance)
    assert len(geometry.exterior.coords) == 1 + 2 * steps


def test_delete_route_invalidates_font_cache(tmp_path, monkeypatch):
    app = create_app(project_root=tmp_path)
    monkeypatch.setattr(app.state.font_catalog, "exclude_font_ids", lambda ids: ids)
    loaded = get_loaded_font(FONT)
    assert TestClient(app).request("DELETE", "/api/fonts", json={"font_ids": ["test"]}).status_code == 200
    assert get_loaded_font(FONT) is not loaded


def test_upload_route_invalidates_font_cache(tmp_path, monkeypatch):
    monkeypatch.setattr("app.font_loader.FontCatalog._font_directories",
                        lambda self: [("project", self.project_root / "fonts")])
    client = TestClient(create_app(project_root=tmp_path))
    loaded = get_loaded_font(FONT)
    response = client.post("/api/fonts/upload", files={"file": (FONT.name, FONT.read_bytes())})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert get_loaded_font(FONT) is not loaded


RING_CASES = json.loads((ROOT / "tests/fixtures/ring_geometry_k0.json").read_text())["cases"]


@pytest.mark.parametrize("case", RING_CASES)
def test_extracted_ring_helpers_match_k0_geometry_and_metadata(case):
    request = CakeTopperRequest(text="Sarah", default_font_id="reference",
                               ring_config={"enabled": True, **case["config"]})
    paths = _compound_paths_from_shapely(box(5, 5, 35, 15), "TEXT")
    geometry, metadata, warnings = _apply_ring_to_base(request, box(0, 0, 40, 20), paths)
    assert hashlib.sha256(to_wkt(geometry, rounding_precision=6).encode()).hexdigest() == case["wkt_sha256"]
    assert metadata.model_dump() == case["metadata"]
    assert warnings == case["warnings"]

"""Code review R1 regressions for the Keychain engine.

F1 / decision D1: the Layered CUT_TEXT layer is welded geometry. A laser cuts
every contour, so overlapping per-letter contours would cut a joined script
name apart. Engraved text keeps its original Q/C curves.
"""
from __future__ import annotations

import itertools
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest
from shapely.ops import unary_union

from app.font_loader import FontCatalog
from app.keychain_engine import KeychainService, prepare_text, text_at
from app.models import GeometryPath, KeychainRequest, PathCommand
from app.shapely_converter import path_to_shapely

ROOT = Path(__file__).resolve().parents[1]
FONT_FILES = {
    "script": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Satisfy/Satisfy-Regular.ttf",
    "display": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Anton/Anton-Regular.ttf",
    "serif": "Anton,League_Spartan,Lora,Quicksand,Satisfy/Lora/static/Lora-Regular.ttf",
    "arabic": "Cairo/static/Cairo-Regular.ttf",
}
SVG = "{http://www.w3.org/2000/svg}"
TOKEN = re.compile(r"[MLQCZ]|-?\d+(?:\.\d+)?(?:e-?\d+)?")
ARITY = {"M": 2, "L": 2, "Q": 4, "C": 6, "Z": 0}
NAMES = [("script", "Sarah"), ("serif", "fifi"), ("display", "Maximilian"), ("arabic", "سارة")]


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


def parse_d(d: str, path_id: str = "p") -> GeometryPath:
    tokens, commands, i = TOKEN.findall(d), [], 0
    while i < len(tokens):
        kind = tokens[i]
        values = [float(v) for v in tokens[i+1:i+1+ARITY[kind]]]
        i += 1 + ARITY[kind]
        if kind in ("M", "L"):
            commands.append(PathCommand(type=kind, x=values[0], y=values[1]))
        elif kind == "Q":
            commands.append(PathCommand(type="Q", x1=values[0], y1=values[1], x=values[2], y=values[3]))
        elif kind == "C":
            commands.append(PathCommand(type="C", x1=values[0], y1=values[1], x2=values[2], y2=values[3],
                                        x=values[4], y=values[5]))
        else:
            commands.append(PathCommand(type="Z"))
    return GeometryPath(path_id=path_id, commands=commands, closed=True)


def layer_paths(svg: str, layer: str) -> list[str]:
    root = ET.fromstring(svg)
    group = next(g for g in root.iter(f"{SVG}g") if g.get("id") == layer)
    return [p.get("d") for p in group.iter(f"{SVG}path")]


def polygons(ds: list[str]):
    out = [path_to_shapely(parse_d(d), tolerance_mm=.002) for d in ds]
    return [p for p in out if p is not None and not p.is_empty]


def worst_overlap(polys) -> float:
    return max((a.intersection(b).area for a, b in itertools.combinations(polys, 2)), default=0.0)


@pytest.mark.parametrize("role,name", NAMES)
@pytest.mark.parametrize("layered_export", ["combined", "separate"])
def test_layered_cut_text_has_no_overlapping_contours(service, catalog, fonts, role, name, layered_export):
    request = KeychainRequest(text=name, font_id=fonts[role], style="layered", layered_export=layered_export,
                              quality="export")
    result = service.generate(request)
    svg = next(f.svg for f in result.files if layered_export == "combined" or f.filename.endswith("-text.svg"))
    ds = layer_paths(svg, "CUT_TEXT")
    polys = polygons(ds)
    assert worst_overlap(polys) <= 1e-6
    prepared = prepare_text(request, catalog, {})
    text, _, _ = text_at(prepared, request, result.scale_applied)
    union = unary_union(polys)
    assert union.area == pytest.approx(text.area, rel=.005)


@pytest.mark.parametrize("role,name", NAMES)
def test_combined_and_separate_cut_text_are_identical(service, fonts, role, name):
    base = dict(text=name, font_id=fonts[role], style="layered", quality="export")
    combined = service.generate(KeychainRequest(**base, layered_export="combined")).files[0].svg
    separate = service.generate(KeychainRequest(**base, layered_export="separate")).files
    text_file = next(f.svg for f in separate if f.filename.endswith("-text.svg"))
    assert layer_paths(combined, "CUT_TEXT") == layer_paths(text_file, "CUT_TEXT")


def test_engraved_text_keeps_curves(service, fonts):
    result = service.generate(KeychainRequest(text="Sarah", font_id=fonts["script"], quality="export"))
    ds = layer_paths(result.files[0].svg, "ENGRAVE_TEXT")
    assert any(re.search(r"[QC]", d) for d in ds)


@pytest.mark.parametrize("target", [30, 60, 90])
def test_welded_cut_text_stays_within_005_mm_of_true_outline(service, catalog, fonts, target):
    request = KeychainRequest(text="Sarah", font_id=fonts["script"], style="layered", quality="export",
                              size={"mode": "width", "target_mm": target})
    result = service.generate(request)
    welded = unary_union(polygons(layer_paths(result.files[0].svg, "CUT_TEXT")))
    # Same placement, flattened from the original curves at a very fine tolerance.
    prepared = prepare_text(request, catalog, {})
    _, paths, _ = text_at(prepared, request, result.scale_applied, include_paths=True)
    shift = result.canvas_width_mm - result.width_mm  # margins are symmetric: 2 mm each side
    assert shift == pytest.approx(4, abs=.01)
    from shapely import affinity
    truth = unary_union([path_to_shapely(p, tolerance_mm=.001) for p in paths])
    dx = welded.bounds[0] - truth.bounds[0]
    dy = welded.bounds[1] - truth.bounds[1]
    truth = affinity.translate(truth, dx, dy)
    assert welded.hausdorff_distance(truth) <= .05


def test_layered_response_reports_cut_overlap_check(service, fonts):
    result = service.generate(KeychainRequest(text="Sarah", font_id=fonts["script"], style="layered",
                                              quality="export"))
    check = next(c for c in result.checks if c.id == "KC-TEXT-CUT-OVERLAP")
    assert check.severity == "pass"
    engraved = service.generate(KeychainRequest(text="Sarah", font_id=fonts["script"]))
    assert all(c.id != "KC-TEXT-CUT-OVERLAP" for c in engraved.checks)


def test_cut_overlap_guard_flags_overlapping_paths():
    from app.keychain_validation import cut_contour_overlap_mm2
    square = lambda x: GeometryPath(path_id=f"s{x}", closed=True, commands=[
        PathCommand(type="M", x=x, y=0), PathCommand(type="L", x=x+2, y=0), PathCommand(type="L", x=x+2, y=2),
        PathCommand(type="L", x=x, y=2), PathCommand(type="Z")])
    assert cut_contour_overlap_mm2([square(0), square(3)]) == 0
    assert cut_contour_overlap_mm2([square(0), square(1)]) == pytest.approx(2, abs=1e-6)

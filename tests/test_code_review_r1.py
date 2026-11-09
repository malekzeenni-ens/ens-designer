"""Code review R1 Phase 4 regressions: F6 (SVG comment injection), F8 (all
floating marks move together), F11 (accent-preserving filenames) and F13
(font handles closed)."""
from __future__ import annotations

import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.floating_component import _bounds, _split_subpaths
from app.font_loader import FontCatalog
from app.keychain_engine import _floating_indices, prepare_text, text_at
from app.main import create_app
from app.models import KeychainRequest
from app.overlap_helpers import _safe_filename

ROOT = Path(__file__).resolve().parents[1]
LORA = "Anton,League_Spartan,Lora,Quicksand,Satisfy/Lora/static/Lora-Regular.ttf"
SVG = "{http://www.w3.org/2000/svg}"


@pytest.fixture(scope="module")
def catalog():
    catalog = FontCatalog(ROOT)
    catalog.list_fonts()
    return catalog


# --- F6 -------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


@pytest.fixture(scope="module")
def font_id(catalog):
    return catalog._read_font("project", ROOT / "fonts" / LORA).info.id


@pytest.mark.parametrize("word", ["Anne--Marie", "x--><g/>", "Jo-"])
def test_cake_topper_recipe_comment_cannot_be_broken_by_user_text(client, font_id, word):
    response = client.post("/api/cake-topper", json={"text": word, "default_font_id": font_id})
    assert response.status_code == 200, response.text
    svg = response.json()["svg"]
    root = ET.fromstring(svg)  # must be well-formed XML
    assert not [el for el in root.iter() if el.tag in ("g", f"{SVG}g") and el.get("id") is None and not list(el)]
    assert "<g/>" not in svg.split("-->")[-1]
    comment = svg[svg.index("<!--"):svg.index("-->") + 3]
    assert "--" not in comment[4:-3]
    assert not comment[4:-3].endswith("-")


# --- F8 -------------------------------------------------------------------

def test_manual_dot_offset_moves_every_floating_mark(catalog):
    font = catalog._read_font("project", ROOT / "fonts" / LORA).info.id
    base = KeychainRequest(text="Zoë", font_id=font, dots={"auto_join": False})
    prepared = prepare_text(base, catalog, {})
    pid = prepared.glyphs[2].path_ids[0]
    floats = prepared.floats[pid]
    assert len(floats) == 2, "Lora ë should have two umlaut dots"
    moved = KeychainRequest(**{**base.model_dump(), "dots": {"auto_join": False, "manual_offsets": [
        {"glyph_index": 2, "x_offset_mm": 1.5, "y_offset_mm": -2}]}})
    scale = .3
    _, before_paths, before_geo = text_at(prepared, base, scale, include_paths=True)
    _, after_paths, after_geo = text_at(prepared, moved, scale, include_paths=True)
    before = _split_subpaths(before_paths[2].commands)
    after = _split_subpaths(after_paths[2].commands)
    body = [i for i in range(len(before)) if i not in floats]
    for i in floats:
        b, a = _bounds(before[i]), _bounds(after[i])
        assert a[0] - b[0] == pytest.approx(1.5, abs=1e-6)
        assert a[1] - b[1] == pytest.approx(-2, abs=1e-6)
    for i in body:
        assert _bounds(after[i]) == pytest.approx(_bounds(before[i]))
    # The shapely geometry moves by the same amount: only the two dots differ.
    from shapely import affinity
    dots_before = before_geo[2].difference(after_geo[2])
    assert dots_before.area > 0
    shifted = affinity.translate(before_geo[2], 1.5, -2)
    assert after_geo[2].difference(before_geo[2]).difference(shifted).area < 1e-6


def test_auto_join_still_joins_i_and_j(catalog):
    font = catalog._read_font("project", ROOT / "fonts" / LORA).info.id
    request = KeychainRequest(text="iji", font_id=font)
    prepared = prepare_text(request, catalog, {})
    for path in prepared.paths:
        assert len(_floating_indices(path)) == 0  # joined: no remaining floating dot


# --- F11 ------------------------------------------------------------------

def test_filenames_keep_accented_letters_as_ascii():
    assert _safe_filename("Zoë") == "zoe"
    assert _safe_filename("Zoé") == "zoe"
    assert _safe_filename("Renée Ørsted") == "renee-orsted"
    assert _safe_filename("Straße") == "strasse"
    assert _safe_filename("Sarah") == "sarah"
    assert _safe_filename("  ") == "design"


def test_untransliterable_names_get_distinct_stable_filenames():
    a, b = _safe_filename("سارة"), _safe_filename("علي")
    assert a != b
    assert a.startswith("design-") and b.startswith("design-")
    assert a == _safe_filename("سارة")
    mixed = _safe_filename("Sarah سارة")
    assert mixed.startswith("sarah-") and mixed != "sarah"


# --- F13 ------------------------------------------------------------------

def _characters_app(tmp_path, font_path):
    app = create_app(project_root=tmp_path)
    app.state.font_catalog = SimpleNamespace(
        get_font_path=lambda _id: font_path,
        get_font_info=lambda _id: SimpleNamespace(full_name="Temp"),
    )
    return app


def test_malformed_font_file_is_closed_after_characters_request(tmp_path):
    bad = tmp_path / "broken.ttf"
    bad.write_bytes(b"\x00\x01\x00\x00" + b"\x00" * 64)
    with TestClient(_characters_app(tmp_path, bad), raise_server_exceptions=False) as client:
        response = client.get("/api/fonts/temp/characters")
        assert response.status_code == 500
        bad.unlink()  # raises PermissionError on Windows while a handle is open
    assert not bad.exists()


def test_font_closed_when_processing_fails_midway(tmp_path, monkeypatch):
    font = tmp_path / "Lora.ttf"
    shutil.copy(ROOT / "fonts" / LORA, font)

    def boom(*_):
        raise RuntimeError("categorisation failed")

    monkeypatch.setattr("app.api.routes.fonts._categorise_codepoint", boom)
    with TestClient(_characters_app(tmp_path, font), raise_server_exceptions=False) as client:
        assert client.get("/api/fonts/temp/characters").status_code == 500
        font.unlink()
    assert not font.exists()

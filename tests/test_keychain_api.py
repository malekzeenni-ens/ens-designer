from __future__ import annotations

import base64
import json
from io import BytesIO
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from fastapi.testclient import TestClient
import pytest
from PIL import Image

from app.font_loader import FontCatalog
from app.main import create_app
from app.models import KeychainRequest

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://www.w3.org/2000/svg"}


@pytest.fixture(scope="module")
def context(tmp_path_factory):
    root = tmp_path_factory.mktemp("keychain-api")
    catalog = FontCatalog(ROOT)
    fonts = catalog.list_fonts()
    font_id = next(font.id for font in fonts if font.full_name == "Anton")
    app = create_app(project_root=root)
    app.state.keychain_service.font_catalog = catalog
    with TestClient(app) as client:
        yield client, app, root, {"text": "Sarah", "font_id": font_id}


def test_preview_forces_fast_quality_and_does_not_write_history(context, monkeypatch):
    client, _, root, payload = context
    monkeypatch.setattr("app.keychain_engine._render_png", lambda *args: pytest.fail("Preview rendered PNG"))
    response = client.post("/api/keychain/preview", json={**payload, "quality": "export", "request_id": 123})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["request_id"] == 123
    assert data["files"] == [] and data["png_base64"] is None
    assert data["width_mm"] == pytest.approx(60, abs=.05)
    assert not any(check["severity"] == "error" for check in data["checks"])
    svg = ET.fromstring(data["preview_svg"])
    assert svg.find("s:metadata", NS) is None
    assert svg.findall(".//*[@data-glyph-index]")
    assert not (root / "backend/data/keychain_history.json").exists()


def test_export_has_real_hole_layers_curve_text_and_recipe(context):
    client, _, root, payload = context
    cake_path = root / "backend/data/cake_topper_history.json"
    cake_path.parent.mkdir(parents=True, exist_ok=True)
    cake_path.write_text('[{"sentinel": true}]')
    response = client.post("/api/keychain/export", json={**payload, "quality": "preview"})
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data["files"]) == 1
    assert base64.b64decode(data["png_base64"]).startswith(b"\x89PNG\r\n\x1a\n")
    image = Image.open(BytesIO(base64.b64decode(data["png_base64"])))
    assert image.mode == "RGBA" and image.getchannel("A").getextrema() == (0, 255)
    assert data["files"][0]["filename"] == "sarah-keychain-60mm.svg"
    svg = ET.fromstring(data["files"][0]["svg"])
    assert svg.attrib["width"].endswith("mm")
    view = list(map(float, re.split(r"[ ,]+", svg.attrib["viewBox"])))
    assert view == pytest.approx([0, 0, data["canvas_width_mm"], data["canvas_height_mm"]], abs=.001)
    assert data["canvas_width_mm"] == pytest.approx(data["width_mm"]+4, abs=.001)
    backing = svg.find("s:g[@id='CUT_BACKING']", NS)
    text = svg.find("s:g[@id='ENGRAVE_TEXT']", NS)
    assert backing.attrib["fill"] == "#000000" and text.attrib["fill"] == "#FF0000"
    assert len(backing.find("s:path", NS).attrib["d"].split("M")) >= 3
    assert any("Q" in path.attrib["d"] or "C" in path.attrib["d"] for path in text.findall("s:path", NS))
    assert not svg.findall(".//*[@data-glyph-index]")
    recipe = json.loads(svg.find("s:metadata[@id='ens-recipe']", NS).text)
    assert recipe["app_version"] == "keychain-1"
    assert KeychainRequest.model_validate(recipe).text == payload["text"]
    assert recipe == data["recipe"]
    history = client.get("/api/keychain/history").json()
    assert len(history) == 1 and history[0]["recipe"] == recipe
    assert cake_path.read_text() == '[{"sentinel": true}]'


@pytest.mark.parametrize("width", [30, 60, 90])
def test_hole_is_five_mm_in_export_at_every_finished_width(context, width):
    client, _, _, payload = context
    data = client.post("/api/keychain/export", json={**payload, "size": {"target_mm": width}}).json()
    svg = ET.fromstring(data["files"][0]["svg"])
    d = svg.find("s:g[@id='CUT_BACKING']/s:path", NS).attrib["d"]
    contours = []
    for part in d.split("M")[1:]:
        numbers = list(map(float, re.findall(r"-?\d+(?:\.\d+)?", part)))
        xs, ys = numbers[::2], numbers[1::2]
        contours.append((max(xs)-min(xs), max(ys)-min(ys)))
    assert any(abs(w-5) <= .01 and abs(h-5) <= .01 for w, h in contours)
    assert max(w for w, _ in contours) == pytest.approx(width, abs=.05)
    assert data["ring"]["hole_diameter_mm"] == 5


def test_layered_separate_exports_align(context):
    client, _, _, payload = context
    data = client.post("/api/keychain/export", json={**payload, "style": "layered", "layered_export": "separate"}).json()
    assert len(data["files"]) == 2
    backing, text = [ET.fromstring(file["svg"]) for file in data["files"]]
    assert backing.attrib["viewBox"] == text.attrib["viewBox"]
    assert backing.find("s:g[@id='CUT_BACKING']", NS) is not None
    assert backing.find("s:g[@id='CUT_TEXT']", NS) is None
    assert text.find("s:g[@id='CUT_TEXT']", NS) is not None
    assert text.find("s:g[@id='CUT_BACKING']", NS) is None


def test_manual_history_append_and_reload(context):
    client, _, _, payload = context
    recipe = KeychainRequest(**payload).model_dump()
    response = client.post("/api/keychain/history", json={"recipe": recipe, "filename": "saved.svg", "width_mm": 60, "height_mm": 30})
    assert response.status_code == 200
    history = client.get("/api/keychain/history").json()
    assert history[0]["filename"] == "saved.svg"
    assert client.post("/api/keychain/preview", json=history[0]["recipe"]).status_code == 200
    assert client.post("/api/keychain/history", json={"recipe": {}, "filename": "bad.svg", "width_mm": 60, "height_mm": 30}).status_code == 422


@pytest.mark.parametrize("override", [
    {"text": " "}, {"text": "a\nb"}, {"text": "a"*41}, {"text": "A\x00B"},
    {"size": {"target_mm": 24}}, {"size": {"mode": "height", "target_mm": 101}},
    {"ring": {"hole_diameter_mm": 7}}, {"backing": {"offset_mm": 0}},
    {"stroke_buffer_mm": 1}, {"overlap_mode": "custom"},
    {"glyph_transforms": [{"glyph_index": 0, "rotation_deg": 46}]},
    {"material_id": "unknown"}, {"colors": {"text": "red"}},
    {"dots": {"manual_offsets": [{"glyph_index": 0, "x_offset_mm": 99}]}},
])
def test_invalid_ranges_return_422(context, override):
    client, _, _, payload = context
    assert client.post("/api/keychain/preview", json={**payload, **override}).status_code == 422


def test_missing_font_and_bad_glyph_index_are_clear_400s(context):
    client, _, _, payload = context
    assert client.post("/api/keychain/preview", json={**payload, "font_id": "missing"}).status_code == 400
    response = client.post("/api/keychain/preview", json={**payload, "glyph_transforms": [{"glyph_index": 99}]})
    assert response.status_code == 400 and "glyph" in response.json()["detail"]


def test_unexpected_engine_error_is_generic_500(context, monkeypatch):
    # R1 F10: unexpected faults are server errors (500), not client errors;
    # the message stays generic. ValueError remains 400.
    client, app, _, payload = context

    def fail(*args):
        raise RuntimeError("private error details")

    monkeypatch.setattr(app.state.keychain_service, "generate", fail)
    response = client.post("/api/keychain/preview", json=payload)
    assert response.status_code == 500
    assert response.json()["detail"] == "Keychain generation failed."


def test_svg_recipe_escapes_user_text(context):
    client, _, _, payload = context
    data = client.post("/api/keychain/export", json={**payload, "text": "A--<&B"}).json()
    svg = ET.fromstring(data["files"][0]["svg"])
    recipe = json.loads(svg.find("s:metadata", NS).text)
    assert recipe["text"] == "A--<&B"


def test_new_routes_precede_static_mount(tmp_path):
    frontend = tmp_path / "dist"
    frontend.mkdir()
    (frontend / "index.html").write_text("<html>Frontend</html>")
    client = TestClient(create_app(project_root=tmp_path, frontend_dist=frontend))
    assert client.get("/api/keychain/history").json() == []
    assert "Frontend" in client.get("/").text


def test_history_skips_malformed_records(context):
    client, app, _, payload = context
    store = app.state.keychain_history_store
    valid = {"recipe": KeychainRequest(**payload).model_dump(), "filename": "retained.svg", "width_mm": 60, "height_mm": 30,
             "timestamp": "2026-11-09T00:00:00+00:00"}
    store._write([None, {"broken": True}, valid, 4])
    assert [entry["filename"] for entry in client.get("/api/keychain/history").json()] == ["retained.svg"]


def test_png_text_counters_reveal_backing_and_ring_hole_stays_transparent(context):
    client, _, _, payload = context
    data = client.post("/api/keychain/export", json={**payload, "text": "O"}).json()
    image = Image.open(BytesIO(base64.b64decode(data["png_base64"]))).convert("RGBA")
    # O's centre is a text counter over the filled backing, not a physical hole.
    bbox = data["glyphs"][0]["bbox_mm"]
    center = ((bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2)
    from app.png_exporter import PNG_SCALE
    assert image.getpixel(tuple(round(value*PNG_SCALE) for value in center)) == (0, 0, 0, 255)
    ring = data["ring"]
    assert image.getpixel((round(ring["center_x_mm"]*PNG_SCALE), round(ring["center_y_mm"]*PNG_SCALE)))[3] == 0

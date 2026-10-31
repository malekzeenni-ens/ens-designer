import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

from app.font_loader import FontCatalog, _content_font_id
from app.main import create_app


def make_font(path: Path, family="Example Serif", style="Regular"):
    builder = FontBuilder(1000, isTTF=True)
    builder.setupGlyphOrder([".notdef", "A"])
    builder.setupCharacterMap({65: "A"})
    pen = TTGlyphPen(None)
    pen.moveTo((0, 0)); pen.lineTo((300, 600)); pen.lineTo((600, 0)); pen.closePath()
    builder.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "A": pen.glyph()})
    builder.setupHorizontalMetrics({name: (650, 0) for name in (".notdef", "A")})
    builder.setupHorizontalHeader(ascent=800, descent=-200)
    builder.setupNameTable({"familyName": family, "styleName": style,
        "fullName": family if style == "Regular" else f"{family} {style}",
        "uniqueFontIdentifier": path.stem, "psName": f"{family.replace(' ', '')}-{style}"})
    builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    builder.setupPost(); builder.setupMaxp(); builder.save(path)
    return _content_font_id(path)


@pytest.fixture
def project(tmp_path, monkeypatch):
    (tmp_path / "fonts").mkdir()
    monkeypatch.setattr(FontCatalog, "_font_directories", lambda self: [("project", self.project_root / "fonts")])
    return tmp_path


def test_embedded_identity_overrides_filename_and_preserves_styles(project):
    regular = make_font(project / "fonts" / "MisleadingDownload123.ttf")
    bold = make_font(project / "fonts" / "AnotherDownload.ttf", style="Bold")
    fonts = {font.id: font for font in FontCatalog(project).list_fonts()}
    assert fonts[regular].full_name == "Example Serif"
    assert fonts[bold].full_name == "Example Serif Bold"
    assert fonts[bold].family == "Example Serif"
    assert fonts[bold].style == "Bold"
    assert "MisleadingDownload123" in fonts[regular].aliases


def test_duplicate_copies_have_one_row_and_all_original_ids_resolve(project):
    first = make_font(project / "fonts" / "A.ttf")
    second = make_font(project / "fonts" / "B.ttf")
    catalog = FontCatalog(project)
    assert len(catalog.list_fonts()) == 1
    assert first != second
    assert catalog.get_font_path(first).name == "A.ttf"
    assert catalog.get_font_path(second).name == "B.ttf"
    with TestClient(create_app(project_root=project)) as client:
        assert len(client.get("/api/fonts").json()) == 1
        assert client.get(f"/api/fonts/{second}/file").status_code == 200


def test_favourite_copy_wins_and_duplicate_manifest_references_are_consolidated(project):
    first = make_font(project / "fonts" / "A.ttf")
    second = make_font(project / "fonts" / "B.ttf")
    (project / "fonts" / ".manual_fonts.json").write_text(json.dumps({"manual": [second, first]}))
    (project / "fonts" / ".uploaded_manifest.json").write_text(json.dumps({"uploaded": [first, second]}))
    catalog = FontCatalog(project)
    assert [font.id for font in catalog.list_fonts()] == [second]
    assert catalog.get_manual_font_ids() == [second]
    assert catalog.get_uploaded_font_ids() == [second]


def test_removing_face_excludes_all_copies_but_keeps_distinct_styles(project):
    first = make_font(project / "fonts" / "A.ttf")
    second = make_font(project / "fonts" / "B.ttf")
    bold = make_font(project / "fonts" / "Bold.ttf", style="Bold")
    catalog = FontCatalog(project)
    catalog.save_manual_font_ids([first]); catalog.record_upload(second)
    assert set(catalog.exclude_font_ids([first])) == {first, second}
    assert [font.id for font in catalog.list_fonts()] == [bold]
    assert catalog.get_manual_font_ids() == []
    assert catalog.get_uploaded_font_ids() == []
    assert [font.id for font in FontCatalog(project).list_fonts()] == [bold]
    assert (project / "fonts" / "A.ttf").exists()


def test_upload_uses_same_embedded_identity_as_catalogue(project):
    first = make_font(project / "fonts" / "UnrelatedDownload.ttf", style="Italic")
    with TestClient(create_app(project_root=project)) as client:
        response = client.post("/api/fonts/upload", files={"file": ("DifferentName.ttf", (project / "fonts" / "UnrelatedDownload.ttf").read_bytes(), "font/ttf")})
        assert response.status_code == 200
        assert response.json()["is_duplicate"] is True
        assert response.json()["font"]["id"] == first
        assert len(list((project / "fonts").glob("*.ttf"))) == 1


def test_unreadable_metadata_falls_back_to_filename(project):
    (project / "fonts" / "Fallback-Bold.ttf").write_bytes(b"invalid-font")
    font = FontCatalog(project).list_fonts()[0]
    assert (font.full_name, font.style) == ("Fallback", "Bold")

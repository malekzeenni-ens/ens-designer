from pathlib import Path

from backend.app.font_loader import FontCatalog, FontRecord
from backend.app.models import FontInfo


def _record(font_id: str, source: str = "system") -> FontRecord:
    return FontRecord(
        info=FontInfo(
            id=font_id,
            family=f"Family {font_id}",
            full_name=f"Font {font_id}",
            style="Regular",
            source=source,
        ),
        path=Path(f"C:/fake/{font_id}.ttf"),
    )


def test_exclude_font_ids_persists_and_cleans_manifests(tmp_path: Path) -> None:
    fonts_dir = tmp_path / "fonts"
    fonts_dir.mkdir()
    catalog = FontCatalog(tmp_path)
    catalog._records = {"keep": _record("keep"), "remove": _record("remove")}
    catalog.save_manual_font_ids(["keep", "remove"])
    catalog.record_upload("remove")

    removed = catalog.exclude_font_ids(["remove", "unknown", "remove"])

    assert removed == ["remove"]
    assert [font.id for font in catalog.list_fonts()] == ["keep"]
    assert catalog.get_manual_font_ids() == ["keep"]
    assert catalog.get_uploaded_font_ids() == []
    assert catalog._read_manifest_ids(".excluded_fonts.json", "excluded") == ["remove"]


def test_exclude_unknown_fonts_is_noop(tmp_path: Path) -> None:
    catalog = FontCatalog(tmp_path)
    catalog._records = {"keep": _record("keep")}

    assert catalog.exclude_font_ids(["unknown"]) == []
    assert [font.id for font in catalog.list_fonts()] == ["keep"]

"""
Regression tests for B1.1: font_id must be a content hash (path-independent),
and stale path-hash manifest entries must be auto-migrated rather than
silently dropping manually-curated fonts.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.font_loader import MANUAL_FONTS_MANIFEST, FontCatalog, _legacy_font_id

FONT_BYTES = b"FAKE-FONT-BINARY-CONTENT-FOR-TESTING"


def _make_project(tmp_path: Path, subdir: str, filename: str = "TestFont.ttf") -> tuple[Path, Path]:
    project_root = tmp_path / subdir
    fonts_dir = project_root / "fonts"
    fonts_dir.mkdir(parents=True)
    font_path = fonts_dir / filename
    font_path.write_bytes(FONT_BYTES)
    return project_root, font_path


def test_font_id_is_stable_across_a_simulated_move(tmp_path: Path) -> None:
    """Same font content at two different paths must yield the same font_id."""
    project_a, _ = _make_project(tmp_path, "before_move")
    project_b, _ = _make_project(tmp_path, "after_move")

    catalog_a = FontCatalog(project_a)
    catalog_b = FontCatalog(project_b)

    fonts_a = {f.full_name: f.id for f in catalog_a.list_fonts() if f.source == "project"}
    fonts_b = {f.full_name: f.id for f in catalog_b.list_fonts() if f.source == "project"}

    assert fonts_a["Test Font"] == fonts_b["Test Font"], (
        "font_id changed after simulating a project move — it must be content-derived, not path-derived."
    )


def test_legacy_manifest_ids_are_remapped_by_filename(tmp_path: Path) -> None:
    """A manifest seeded with old-style path-hash IDs must be rewritten with the new content-hash ID."""
    project_root, font_path = _make_project(tmp_path, "proj")
    legacy_id = _legacy_font_id(font_path)

    manifest_path = project_root / "fonts" / MANUAL_FONTS_MANIFEST
    manifest_path.write_text(json.dumps({"manual": [legacy_id]}), encoding="utf-8")

    catalog = FontCatalog(project_root)
    manual_ids = catalog.get_manual_font_ids()

    assert len(manual_ids) == 1
    assert manual_ids[0] != legacy_id, "manifest still holds the stale path-hash id"

    rewritten = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert rewritten["manual"] == manual_ids
    assert legacy_id not in rewritten["manual"]


def test_unmappable_manifest_id_is_dropped_with_warning(tmp_path: Path, caplog) -> None:
    """An ID that matches no current file (legacy or content hash) must be dropped, not crash, and logged."""
    project_root, _ = _make_project(tmp_path, "proj")
    bogus_id = "0000000000000000"

    manifest_path = project_root / "fonts" / MANUAL_FONTS_MANIFEST
    manifest_path.write_text(json.dumps({"manual": [bogus_id]}), encoding="utf-8")

    catalog = FontCatalog(project_root)
    with caplog.at_level("WARNING"):
        manual_ids = catalog.get_manual_font_ids()

    assert manual_ids == []
    rewritten = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert rewritten["manual"] == []
    assert any(bogus_id in record.message for record in caplog.records)

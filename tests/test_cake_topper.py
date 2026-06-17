"""Improvement Phase 2B + 3 — Cake Topper Engine tests.

Covers:
- Basic response shape
- Line splitting and word assignment
- SVG export invariants
- PNG export
- Alignment modes
- Inter-line gap behaviour
- No-connectivity guarantee
- API validation
- Truncation warning
- Missing glyph warning field
- Overlap gap controls
"""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

CANVAS_PADDING_MM = 5.0


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def font_id(client: TestClient) -> str:
    fonts = client.get("/api/fonts").json()
    preferred = next((f for f in fonts if "anton" in f["full_name"].lower()), fonts[0])
    return preferred["id"]


def _ct(client: TestClient, font_id: str, text: str = "Happy Birthday", **kwargs) -> dict:
    """POST /api/cake-topper and return the JSON body; raises on non-200."""
    body = {"text": text, "default_font_id": font_id, **kwargs}
    r = client.post("/api/cake-topper", json=body)
    assert r.status_code == 200, f"Unexpected {r.status_code}: {r.text[:200]}"
    return r.json()


def _ct_raw(client: TestClient, font_id: str, text: str = "Happy Birthday", **kwargs):
    """POST /api/cake-topper and return the raw Response."""
    body = {"text": text, "default_font_id": font_id, **kwargs}
    return client.post("/api/cake-topper", json=body)


# ---------------------------------------------------------------------------
# Basic response shape
# ---------------------------------------------------------------------------

class TestCakeTopperBasics:
    def test_returns_200(self, client: TestClient, font_id: str) -> None:
        r = _ct_raw(client, font_id)
        assert r.status_code == 200

    def test_response_has_svg(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        assert "<svg" in data["svg"]
        assert "<path" in data["svg"]

    def test_response_has_png_base64(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        png = base64.b64decode(data["png_base64"])
        assert png[:4] == b"\x89PNG"

    def test_response_has_metadata(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        meta = data["metadata"]
        assert "words" in meta
        assert "lines" in meta
        assert "canvas_width_mm" in meta
        assert "canvas_height_mm" in meta
        assert "inter_line_gaps_mm" in meta

    def test_warnings_field_is_list(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        assert isinstance(data["warnings"], list)

    def test_svg_filename_derived_from_words(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        assert data["svg_filename"].endswith(".svg")
        assert data["png_filename"].endswith(".png")


# ---------------------------------------------------------------------------
# Line splitting and word assignment
# ---------------------------------------------------------------------------

class TestLineSplit:
    def test_two_words_produces_two_lines(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        assert len(data["metadata"]["lines"]) == 2
        assert data["metadata"]["words"] == ["Happy", "Birthday"]

    def test_three_words_produces_three_lines(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday Sarah")
        assert len(data["metadata"]["lines"]) == 3

    def test_line_texts_are_correct(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        assert data["metadata"]["lines"][0]["text"] == "Happy"
        assert data["metadata"]["lines"][1]["text"] == "Birthday"

    def test_line1_is_not_last_word(self, client: TestClient, font_id: str) -> None:
        """Regression: line titles must not all show the last word."""
        data = _ct(client, font_id, text="Happy Birthday")
        assert data["metadata"]["lines"][0]["text"] != "Birthday"

    def test_single_word_produces_one_line(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Sarah")
        assert len(data["metadata"]["lines"]) == 1
        assert data["metadata"]["lines"][0]["text"] == "Sarah"

    def test_five_words_truncated_to_four(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="One Two Three Four Five")
        assert len(data["metadata"]["lines"]) == 4
        assert data["metadata"]["words"] == ["One", "Two", "Three", "Four"]

    def test_truncation_warning_issued(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="One Two Three Four Five")
        assert any("Five" in w for w in data["warnings"]), (
            f"Expected dropped word 'Five' in warnings; got: {data['warnings']}"
        )

    def test_truncation_warning_mentions_max(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="A B C D E")
        assert any("4" in w or "maximum" in w.lower() for w in data["warnings"])


# ---------------------------------------------------------------------------
# SVG export invariants
# ---------------------------------------------------------------------------

class TestSVGInvariants:
    def test_no_text_elements(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id)["svg"]
        assert "<text" not in svg
        assert "<tspan" not in svg

    def test_uses_mm_units(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id)["svg"]
        assert "mm" in svg

    def test_has_viewbox(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id)["svg"]
        assert "viewBox" in svg

    def test_fill_rule_nonzero(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id)["svg"]
        assert "nonzero" in svg

    def test_no_background_rect(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id)["svg"]
        assert "<rect" not in svg

    def test_svg_dimensions_match_metadata(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        svg = data["svg"]
        meta = data["metadata"]
        assert f'{meta["canvas_width_mm"]}mm' in svg
        assert f'{meta["canvas_height_mm"]}mm' in svg

    def test_has_no_font_references(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id)["svg"]
        assert "font-family" not in svg
        assert "@font-face" not in svg


# ---------------------------------------------------------------------------
# PNG export
# ---------------------------------------------------------------------------

class TestPNGExport:
    def test_png_header_valid(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        png = base64.b64decode(data["png_base64"])
        assert png[:4] == b"\x89PNG", "Response PNG_base64 does not decode to a valid PNG"

    def test_png_is_not_empty(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        png = base64.b64decode(data["png_base64"])
        assert len(png) > 100, "PNG is suspiciously small — may be blank"


# ---------------------------------------------------------------------------
# Alignment modes
# ---------------------------------------------------------------------------

class TestAlignmentModes:
    def _single_line(self, client, font_id, alignment, offset_mm=0.0):
        return _ct(client, font_id, text="Sarah", line_configs=[{
            "font_id": font_id,
            "alignment": alignment,
            "alignment_offset_mm": offset_mm,
        }])

    def test_left_alignment_x_offset(self, client: TestClient, font_id: str) -> None:
        data = self._single_line(client, font_id, "left")
        assert data["metadata"]["lines"][0]["x_offset_mm"] == pytest.approx(CANVAS_PADDING_MM, abs=0.001)

    def test_center_alignment_x_offset(self, client: TestClient, font_id: str) -> None:
        data = self._single_line(client, font_id, "center")
        meta = data["metadata"]
        line = meta["lines"][0]
        expected = (meta["canvas_width_mm"] - line["width_mm"]) / 2.0
        assert line["x_offset_mm"] == pytest.approx(expected, abs=0.01)

    def test_right_alignment_x_offset(self, client: TestClient, font_id: str) -> None:
        data = self._single_line(client, font_id, "right")
        meta = data["metadata"]
        line = meta["lines"][0]
        expected = meta["canvas_width_mm"] - CANVAS_PADDING_MM - line["width_mm"]
        assert line["x_offset_mm"] == pytest.approx(expected, abs=0.01)

    def test_manual_alignment_x_offset(self, client: TestClient, font_id: str) -> None:
        data = self._single_line(client, font_id, "manual", offset_mm=12.5)
        expected = CANVAS_PADDING_MM + 12.5
        assert data["metadata"]["lines"][0]["x_offset_mm"] == pytest.approx(expected, abs=0.001)

    def test_left_and_manual_produce_different_offsets(self, client: TestClient, font_id: str) -> None:
        # Manual at +20mm must differ from left (which is always CANVAS_PADDING_MM).
        left_x = self._single_line(client, font_id, "left")["metadata"]["lines"][0]["x_offset_mm"]
        manual_x = self._single_line(client, font_id, "manual", offset_mm=20.0)["metadata"]["lines"][0]["x_offset_mm"]
        assert left_x != manual_x


# ---------------------------------------------------------------------------
# Inter-line gap behaviour
# ---------------------------------------------------------------------------

class TestInterLineGaps:
    def test_default_gap_in_metadata(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        assert data["metadata"]["inter_line_gaps_mm"] == [3.0]

    def test_custom_gap_reflected_in_metadata(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday", inter_line_gaps_mm=[-5.0])
        assert data["metadata"]["inter_line_gaps_mm"] == [-5.0]

    def test_negative_gap_reduces_canvas_height(self, client: TestClient, font_id: str) -> None:
        positive = _ct(client, font_id, text="Happy Birthday", inter_line_gaps_mm=[10.0])
        negative = _ct(client, font_id, text="Happy Birthday", inter_line_gaps_mm=[-10.0])
        assert negative["metadata"]["canvas_height_mm"] < positive["metadata"]["canvas_height_mm"]


# ---------------------------------------------------------------------------
# No connectivity guarantee
# ---------------------------------------------------------------------------

class TestNoConnectivity:
    def test_no_welding_field(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        assert "welding" not in data

    def test_no_validation_field(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        assert "validation" not in data

    def test_no_geometry_field(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        assert "geometry" not in data

    def test_no_connectivity_score(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id)
        assert "connectivity_score" not in data


# ---------------------------------------------------------------------------
# API validation
# ---------------------------------------------------------------------------

class TestAPIValidation:
    def test_empty_string_rejected(self, client: TestClient, font_id: str) -> None:
        r = _ct_raw(client, font_id, text="")
        assert r.status_code in (400, 422)

    def test_whitespace_only_rejected(self, client: TestClient, font_id: str) -> None:
        r = _ct_raw(client, font_id, text="   ")
        assert r.status_code in (400, 422)

    def test_unknown_font_rejected(self, client: TestClient) -> None:
        r = _ct_raw(client, "not-a-real-font-id", text="Hello")
        assert r.status_code == 400

    def test_text_too_long_rejected(self, client: TestClient, font_id: str) -> None:
        r = _ct_raw(client, font_id, text="x" * 201)
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Glyph and floating component metadata
# ---------------------------------------------------------------------------

class TestGlyphMetadata:
    def test_glyph_chars_present(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        for line in data["metadata"]["lines"]:
            assert isinstance(line["glyph_chars"], list)
            assert len(line["glyph_chars"]) > 0

    def test_gaps_before_and_after_present(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        for line in data["metadata"]["lines"]:
            assert isinstance(line["gaps_before_mm"], list)
            assert isinstance(line["gaps_after_mm"], list)
            assert len(line["gaps_before_mm"]) == len(line["gaps_before_mm"])

    def test_floating_components_field_is_list(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        for line in data["metadata"]["lines"]:
            assert isinstance(line["floating_components"], list)

    def test_line_dimensions_are_positive(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy Birthday")
        for line in data["metadata"]["lines"]:
            assert line["width_mm"] > 0
            assert line["height_mm"] > 0


# ---------------------------------------------------------------------------
# Overlap controls
# ---------------------------------------------------------------------------

class TestOverlapControls:
    def test_disabled_gap_not_shifted(self, client: TestClient, font_id: str) -> None:
        """A disabled gap should leave gaps_after_mm[0] close to gaps_before_mm[0]."""
        data = _ct(client, font_id, text="Oliver", line_configs=[{
            "font_id": font_id,
            "gap_configs": [{"pair_index": 0, "enabled": False, "overlap_mm": 1.5}],
        }])
        line = data["metadata"]["lines"][0]
        if line["gaps_before_mm"]:
            assert abs(line["gaps_after_mm"][0] - line["gaps_before_mm"][0]) < 0.01

    def test_medium_overlap_reduces_gaps(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Oliver", default_overlap_mode="medium")
        line = data["metadata"]["lines"][0]
        positive_befores = [b for b in line["gaps_before_mm"] if b > 0]
        if positive_befores:
            for before, after in zip(line["gaps_before_mm"], line["gaps_after_mm"]):
                if before > 0:
                    assert after < before


# ---------------------------------------------------------------------------
# Manual canvas offset
# ---------------------------------------------------------------------------

class TestManualOffsets:
    def test_manual_offsets_default_to_zero(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy")
        lm = data["metadata"]["lines"][0]
        assert lm["manual_x_offset_mm"] == 0.0
        assert lm["manual_y_offset_mm"] == 0.0

    def test_manual_x_offset_shifts_metadata(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy",
                   line_configs=[{"font_id": font_id, "font_size_mm": 42}])
        shifted = _ct(client, font_id, text="Happy",
                      line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                     "manual_x_offset_mm": 10.0}])
        delta = shifted["metadata"]["lines"][0]["x_offset_mm"] - base["metadata"]["lines"][0]["x_offset_mm"]
        assert abs(delta - 10.0) < 0.01

    def test_manual_y_offset_shifts_metadata(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy",
                   line_configs=[{"font_id": font_id, "font_size_mm": 42}])
        shifted = _ct(client, font_id, text="Happy",
                      line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                     "manual_y_offset_mm": 8.0}])
        delta = shifted["metadata"]["lines"][0]["y_offset_mm"] - base["metadata"]["lines"][0]["y_offset_mm"]
        assert abs(delta - 8.0) < 0.01

    def test_manual_offsets_reflected_in_metadata(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy",
                   line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                  "manual_x_offset_mm": 3.5, "manual_y_offset_mm": -2.0}])
        lm = data["metadata"]["lines"][0]
        assert lm["manual_x_offset_mm"] == 3.5
        assert lm["manual_y_offset_mm"] == -2.0

    def test_zero_offsets_preserve_alignment(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy",
                   line_configs=[{"font_id": font_id, "font_size_mm": 42}])
        explicit = _ct(client, font_id, text="Happy",
                       line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                      "manual_x_offset_mm": 0.0, "manual_y_offset_mm": 0.0}])
        assert base["metadata"]["lines"][0]["x_offset_mm"] == explicit["metadata"]["lines"][0]["x_offset_mm"]
        assert base["metadata"]["lines"][0]["y_offset_mm"] == explicit["metadata"]["lines"][0]["y_offset_mm"]

    def test_large_positive_x_offset_expands_canvas(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy",
                   line_configs=[{"font_id": font_id, "font_size_mm": 42}])
        shifted = _ct(client, font_id, text="Happy",
                      line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                     "manual_x_offset_mm": 80.0}])
        line = shifted["metadata"]["lines"][0]
        assert shifted["metadata"]["canvas_width_mm"] > base["metadata"]["canvas_width_mm"]
        assert line["x_offset_mm"] + line["width_mm"] <= (
            shifted["metadata"]["canvas_width_mm"] - CANVAS_PADDING_MM + 0.01
        )

    def test_large_negative_x_offset_rebases_canvas(self, client: TestClient, font_id: str) -> None:
        shifted = _ct(client, font_id, text="Happy",
                      line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                     "manual_x_offset_mm": -80.0}])
        line = shifted["metadata"]["lines"][0]
        assert line["manual_x_offset_mm"] == -80.0
        assert line["x_offset_mm"] >= CANVAS_PADDING_MM - 0.01

    def test_large_positive_y_offset_expands_canvas(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy",
                   line_configs=[{"font_id": font_id, "font_size_mm": 42}])
        shifted = _ct(client, font_id, text="Happy",
                      line_configs=[{"font_id": font_id, "font_size_mm": 42,
                                     "manual_y_offset_mm": 80.0}])
        line = shifted["metadata"]["lines"][0]
        assert shifted["metadata"]["canvas_height_mm"] > base["metadata"]["canvas_height_mm"]
        assert line["y_offset_mm"] + line["height_mm"] <= (
            shifted["metadata"]["canvas_height_mm"] - CANVAS_PADDING_MM + 0.01
        )


# ---------------------------------------------------------------------------
# Stakes
# ---------------------------------------------------------------------------

class TestCakeTopperStakes:
    def test_default_has_no_stakes(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy")
        assert data["metadata"]["stakes"] == []

    def test_one_stake_metadata_and_dimensions(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy", stake_config={"count": 1})
        stakes = data["metadata"]["stakes"]
        assert len(stakes) == 1
        assert stakes[0]["width_mm"] == 3.0
        assert stakes[0]["length_mm"] == 50.0
        assert stakes[0]["y_offset_mm"] < data["metadata"]["canvas_height_mm"]

    def test_two_stakes_metadata(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy", stake_config={"count": 2})
        stakes = data["metadata"]["stakes"]
        assert len(stakes) == 2
        assert stakes[0]["x_offset_mm"] < stakes[1]["x_offset_mm"]

    def test_stake_offsets_shift_metadata(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy", stake_config={"count": 1})
        shifted = _ct(client, font_id, text="Happy", stake_config={
            "count": 1,
            "offsets": [{"stake_index": 0, "x_offset_mm": 12.0, "y_offset_mm": 6.0}],
        })
        base_stake = base["metadata"]["stakes"][0]
        shifted_stake = shifted["metadata"]["stakes"][0]
        assert shifted_stake["manual_x_offset_mm"] == 12.0
        assert shifted_stake["manual_y_offset_mm"] == 6.0
        assert shifted_stake["x_offset_mm"] - base_stake["x_offset_mm"] == pytest.approx(12.0, abs=0.01)
        assert shifted_stake["y_offset_mm"] - base_stake["y_offset_mm"] == pytest.approx(6.0, abs=0.01)

    def test_stake_shape_uses_flat_top_and_curved_point(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id, text="Happy", stake_config={"count": 1})["svg"]
        assert 'id="S0-stake"' in svg
        assert " Q " in svg


# ---------------------------------------------------------------------------
# Ring / Keyhole
# ---------------------------------------------------------------------------

class TestCakeTopperRing:
    def test_default_has_no_ring(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy")
        assert data["metadata"]["ring"] is None

    def test_enabled_ring_metadata_defaults(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={"enabled": True})
        ring = data["metadata"]["ring"]
        assert ring is not None
        assert ring["outer_diameter_mm"] == 12.0
        assert ring["hole_diameter_mm"] == 5.0
        assert ring["wall_thickness_mm"] == 3.5
        assert ring["position"] == "top-left"

    def test_invalid_wall_thickness_returns_warning(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={
            "enabled": True,
            "outer_diameter_mm": 10.0,
            "hole_diameter_mm": 6.0,
        })
        ring = data["metadata"]["ring"]
        assert ring is not None
        assert ring["is_valid"] is False
        assert any("wall thickness" in warning.lower() for warning in ring["warnings"])
        assert any("wall thickness" in warning.lower() for warning in data["warnings"])

    def test_ring_requires_outline_warning_without_backing(self, client: TestClient, font_id: str) -> None:
        data = _ct(client, font_id, text="Happy", ring_config={"enabled": True})
        assert data["metadata"]["ring"] is not None
        assert any("outline" in warning.lower() for warning in data["warnings"])
        assert "R0-backing-with-ring" not in data["svg"]

    def test_svg_contains_backing_with_real_ring_hole_geometry(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={"enabled": True})["svg"]
        assert 'id="R0-backing-with-ring-0000"' in svg
        assert "<circle" not in svg
        assert "#FFFFFF" not in svg.upper()
        ring_path_start = svg.index('id="R0-backing-with-ring-0000"')
        path_tag_start = svg.rfind("<path", 0, ring_path_start)
        path_tag_end = svg.find("/>", ring_path_start)
        ring_path_tag = svg[path_tag_start:path_tag_end]
        assert ring_path_tag.count("M ") >= 2
        assert ring_path_tag.count("Z") >= 2

    def test_ring_offsets_shift_metadata(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={"enabled": True})
        shifted = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={
            "enabled": True,
            "x_offset_mm": 4.0,
            "y_offset_mm": -2.0,
        })
        base_ring = base["metadata"]["ring"]
        shifted_ring = shifted["metadata"]["ring"]
        assert shifted_ring["x_offset_mm"] == 4.0
        assert shifted_ring["y_offset_mm"] == -2.0
        assert shifted_ring["center_x_mm"] - base_ring["center_x_mm"] == pytest.approx(4.0, abs=0.01)

    def test_ring_canvas_expands_when_moved_up(self, client: TestClient, font_id: str) -> None:
        base = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={"enabled": True})
        shifted = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={
            "enabled": True,
            "y_offset_mm": -4.0,
        })
        assert shifted["metadata"]["canvas_height_mm"] > base["metadata"]["canvas_height_mm"]

    def test_ring_positions_produce_different_centres(self, client: TestClient, font_id: str) -> None:
        left = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={
            "enabled": True,
            "position": "top-left",
        })["metadata"]["ring"]
        center = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={
            "enabled": True,
            "position": "top-center",
        })["metadata"]["ring"]
        right = _ct(client, font_id, text="Happy", outline_enabled=True, ring_config={
            "enabled": True,
            "position": "top-right",
        })["metadata"]["ring"]
        assert left["center_x_mm"] < center["center_x_mm"] < right["center_x_mm"]

    def test_ring_uses_outline_colour(self, client: TestClient, font_id: str) -> None:
        svg = _ct(client, font_id, text="Happy", outline_enabled=True, outline_color="#FFD700", ring_config={
            "enabled": True,
        })["svg"]
        ring_path_start = svg.index('id="R0-backing-with-ring-0000"')
        path_tag_start = svg.rfind("<path", 0, ring_path_start)
        path_tag_end = svg.find("/>", ring_path_start)
        ring_path_tag = svg[path_tag_start:path_tag_end]
        assert 'fill="#FFD700"' in ring_path_tag

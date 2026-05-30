from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models import GeometryPath, GlyphGeometry, PathCommand
from app.shapely_converter import count_connected_components, glyph_to_shapely, path_to_shapely, shapely_to_paths


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def font_id(client: TestClient) -> str:
    response = client.get("/api/fonts")
    assert response.status_code == 200
    fonts = response.json()
    assert fonts
    preferred = next((f for f in fonts if "arial" in f["full_name"].lower()), fonts[0])
    return preferred["id"]


def _square_path(x: float, y: float, size: float, path_id: str) -> GeometryPath:
    """Return a closed square GeometryPath for testing."""
    return GeometryPath(
        path_id=path_id,
        closed=True,
        commands=[
            PathCommand(type="M", x=x, y=y),
            PathCommand(type="L", x=x + size, y=y),
            PathCommand(type="L", x=x + size, y=y + size),
            PathCommand(type="L", x=x, y=y + size),
            PathCommand(type="Z"),
        ],
    )


def _glyph(path_ids: list[str], glyph_id: int = 1) -> GlyphGeometry:
    return GlyphGeometry(
        glyph_id=glyph_id,
        glyph_name="test",
        cluster=0,
        advance_x=10.0,
        advance_y=0.0,
        offset_x=0.0,
        offset_y=0.0,
        path_ids=path_ids,
    )


# ---------------------------------------------------------------------------
# Unit tests — shapely_converter
# ---------------------------------------------------------------------------


class TestPathToShapely:
    def test_square_path_produces_valid_polygon(self) -> None:
        path = _square_path(0, 0, 10, "sq")
        poly = path_to_shapely(path)
        assert poly is not None
        assert not poly.is_empty
        assert poly.area > 0

    def test_quadratic_bezier_path_produces_valid_polygon(self) -> None:
        path = GeometryPath(
            path_id="q",
            closed=True,
            commands=[
                PathCommand(type="M", x=0.0, y=0.0),
                PathCommand(type="Q", x1=5.0, y1=10.0, x=10.0, y=0.0),
                PathCommand(type="L", x=10.0, y=5.0),
                PathCommand(type="L", x=0.0, y=5.0),
                PathCommand(type="Z"),
            ],
        )
        poly = path_to_shapely(path)
        assert poly is not None
        assert poly.area > 0

    def test_cubic_bezier_path_produces_valid_polygon(self) -> None:
        path = GeometryPath(
            path_id="c",
            closed=True,
            commands=[
                PathCommand(type="M", x=0.0, y=0.0),
                PathCommand(type="C", x1=3.0, y1=8.0, x2=7.0, y2=8.0, x=10.0, y=0.0),
                PathCommand(type="L", x=10.0, y=5.0),
                PathCommand(type="L", x=0.0, y=5.0),
                PathCommand(type="Z"),
            ],
        )
        poly = path_to_shapely(path)
        assert poly is not None
        assert poly.area > 0

    def test_too_few_points_returns_none(self) -> None:
        path = GeometryPath(
            path_id="bad",
            closed=True,
            commands=[
                PathCommand(type="M", x=0.0, y=0.0),
                PathCommand(type="Z"),
            ],
        )
        assert path_to_shapely(path) is None


class TestCountConnectedComponents:
    def test_single_glyph_is_one_component(self) -> None:
        path = _square_path(0, 0, 10, "a")
        glyph = _glyph(["a"])
        geom = glyph_to_shapely(glyph, {"a": path})
        assert count_connected_components([geom]) == 1

    def test_touching_squares_are_one_component(self) -> None:
        left = _square_path(0, 0, 10, "L")
        right = _square_path(10, 0, 10, "R")  # shares right edge of left
        gL = _glyph(["L"], glyph_id=1)
        gR = _glyph(["R"], glyph_id=2)
        path_map = {"L": left, "R": right}
        geoms = [glyph_to_shapely(g, path_map) for g in [gL, gR]]
        assert count_connected_components(geoms) == 1

    def test_overlapping_squares_are_one_component(self) -> None:
        left = _square_path(0, 0, 10, "L")
        right = _square_path(8, 0, 10, "R")  # overlaps by 2mm
        gL = _glyph(["L"], glyph_id=1)
        gR = _glyph(["R"], glyph_id=2)
        path_map = {"L": left, "R": right}
        geoms = [glyph_to_shapely(g, path_map) for g in [gL, gR]]
        assert count_connected_components(geoms) == 1

    def test_gapped_squares_are_two_components(self) -> None:
        left = _square_path(0, 0, 10, "L")
        right = _square_path(15, 0, 10, "R")  # 5mm gap
        gL = _glyph(["L"], glyph_id=1)
        gR = _glyph(["R"], glyph_id=2)
        path_map = {"L": left, "R": right}
        geoms = [glyph_to_shapely(g, path_map) for g in [gL, gR]]
        assert count_connected_components(geoms) == 2

    def test_three_gapped_squares_are_three_components(self) -> None:
        paths = {
            "a": _square_path(0, 0, 5, "a"),
            "b": _square_path(10, 0, 5, "b"),
            "c": _square_path(20, 0, 5, "c"),
        }
        glyphs = [_glyph([k], glyph_id=i) for i, k in enumerate(["a", "b", "c"])]
        geoms = [glyph_to_shapely(g, paths) for g in glyphs]
        assert count_connected_components(geoms) == 3

    def test_empty_list_returns_zero(self) -> None:
        assert count_connected_components([]) == 0

    def test_none_geometries_ignored(self) -> None:
        path = _square_path(0, 0, 10, "a")
        glyph = _glyph(["a"])
        geom = glyph_to_shapely(glyph, {"a": path})
        assert count_connected_components([geom, None]) == 1


class TestShapelyToPaths:
    def test_polygon_produces_exterior_path(self) -> None:
        from shapely.geometry import Polygon
        poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        paths = shapely_to_paths(poly, "test")
        assert len(paths) == 1
        assert paths[0].closed

    def test_polygon_with_hole_produces_two_paths(self) -> None:
        from shapely.geometry import Polygon
        poly = Polygon(
            [(0, 0), (20, 0), (20, 20), (0, 20)],
            [[(5, 5), (15, 5), (15, 15), (5, 15)]],
        )
        paths = shapely_to_paths(poly, "test")
        assert len(paths) == 2

    def test_none_produces_empty_list(self) -> None:
        assert shapely_to_paths(None, "test") == []


# ---------------------------------------------------------------------------
# Integration tests — three levels via API
# ---------------------------------------------------------------------------


class TestLevel1NaturalConnectivity:
    """Single-glyph inputs are always naturally connected."""

    def test_single_character_is_natural(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "A", "font_id": font_id})
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        assert welding["strategy"] == "natural"
        assert welding["bridges_added"] == 0
        assert welding["compression_amount_mm"] == 0.0

    def test_single_character_connectivity_score_is_100(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "O", "font_id": font_id})
        assert response.status_code == 200
        validation = response.json()["geometry"]["validation"]
        assert validation["connectivity_score"] == 100


class TestLevel2LetterCompression:
    """Multi-character names in a standard font should connect via compression."""

    @pytest.mark.parametrize("name", ["Oliver", "Amelia", "Hannah"])
    def test_short_name_connects_via_compression_or_better(self, client: TestClient, font_id: str, name: str) -> None:
        response = client.post("/api/generate", json={"text": name, "font_id": font_id})
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        # Must be natural or compression — bridges are not expected for short names in a standard font.
        assert welding["strategy"] in ("natural", "compression")
        assert welding["connected_components_after"] == 1

    def test_compression_strategy_has_positive_compression_amount(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id})
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        if welding["strategy"] == "compression":
            assert welding["compression_amount_mm"] > 0

    def test_compression_connectivity_score_is_high(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id})
        assert response.status_code == 200
        validation = response.json()["geometry"]["validation"]
        # Natural (100) or compression (95) — both well above the old 15.
        assert validation["connectivity_score"] >= 95

    def test_components_after_is_one_when_compression_succeeds(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "Amelia", "font_id": font_id})
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        if welding["strategy"] == "compression":
            assert welding["connected_components_after"] == 1
            assert welding["bridges_added"] == 0


class TestLevel3BridgeFallback:
    """When welding is disabled, strategy is natural (no processing). Bridge fallback fires when needed."""

    def test_welding_disabled_returns_natural_strategy(self, client: TestClient, font_id: str) -> None:
        response = client.post(
            "/api/generate",
            json={"text": "Oliver", "font_id": font_id, "welding_enabled": False},
        )
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        assert welding["strategy"] == "natural"
        assert welding["bridges_added"] == 0


class TestConnectivityMetadataFields:
    """Verify all new fields are present in the API response."""

    def test_welding_has_strategy_field(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id})
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        assert "strategy" in welding
        assert welding["strategy"] in ("natural", "compression", "bridge", "disconnected")

    def test_welding_has_compression_amount_field(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id})
        assert response.status_code == 200
        welding = response.json()["geometry"]["welding"]
        assert "compression_amount_mm" in welding
        assert isinstance(welding["compression_amount_mm"], float)

    def test_svg_is_present_after_compression(self, client: TestClient, font_id: str) -> None:
        response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id})
        assert response.status_code == 200
        payload = response.json()
        assert "<svg" in payload["svg"]
        assert "<path" in payload["svg"]

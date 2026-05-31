"""Phase X — Overlap Engine tests."""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def font_id(client: TestClient) -> str:
    fonts = client.get("/api/fonts").json()
    preferred = next((f for f in fonts if "anton" in f["full_name"].lower()), fonts[0])
    return preferred["id"]


def _overlap(client, font_id, mode="medium", custom_mm=None):
    body = {"text": "Oliver", "font_id": font_id, "overlap_mode": mode}
    if custom_mm is not None:
        body["overlap_custom_mm"] = custom_mm
    return client.post("/api/overlap", json=body)


class TestOverlapBasics:
    def test_overlap_returns_200(self, client: TestClient, font_id: str) -> None:
        assert _overlap(client, font_id).status_code == 200

    def test_response_has_svg(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id)
        svg = r.json()["svg"]
        assert "<svg" in svg
        assert "<path" in svg

    def test_response_has_png(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id)
        png = base64.b64decode(r.json()["png_base64"])
        assert png.startswith(b"\x89PNG")

    def test_response_has_overlap_metadata(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id)
        meta = r.json()["overlap_metadata"]
        assert "mode" in meta
        assert "target_overlap_mm" in meta
        assert "gaps_before_mm" in meta
        assert "gaps_after_mm" in meta

    def test_svg_uses_nonzero_fill_rule(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id)
        assert 'fill-rule="nonzero"' in r.json()["svg"] or "fill-rule:nonzero" in r.json()["svg"]

    def test_svg_uses_mm_units(self, client: TestClient, font_id: str) -> None:
        assert "mm" in _overlap(client, font_id).json()["svg"]


class TestOverlapModes:
    @pytest.mark.parametrize("mode", ["auto", "light", "medium", "strong"])
    def test_named_mode_returns_200(self, client: TestClient, font_id: str, mode: str) -> None:
        assert _overlap(client, font_id, mode=mode).status_code == 200

    def test_medium_overlaps_more_than_light(self, client: TestClient, font_id: str) -> None:
        light = _overlap(client, font_id, mode="light").json()["overlap_metadata"]["target_overlap_mm"]
        medium = _overlap(client, font_id, mode="medium").json()["overlap_metadata"]["target_overlap_mm"]
        assert medium > light

    def test_strong_overlaps_more_than_medium(self, client: TestClient, font_id: str) -> None:
        medium = _overlap(client, font_id, mode="medium").json()["overlap_metadata"]["target_overlap_mm"]
        strong = _overlap(client, font_id, mode="strong").json()["overlap_metadata"]["target_overlap_mm"]
        assert strong > medium

    def test_custom_mode_uses_specified_mm(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id, mode="custom", custom_mm=2.0)
        assert r.status_code == 200
        assert r.json()["overlap_metadata"]["target_overlap_mm"] == 2.0

    def test_gaps_after_are_smaller_than_before(self, client: TestClient, font_id: str) -> None:
        meta = _overlap(client, font_id, mode="medium").json()["overlap_metadata"]
        for before, after in zip(meta["gaps_before_mm"], meta["gaps_after_mm"]):
            if before > 0:
                assert after < before, f"Gap {before:.3f} mm was not reduced (after={after:.3f} mm)"

    def test_gaps_after_are_negative_for_medium(self, client: TestClient, font_id: str) -> None:
        """Medium mode should create actual overlap (negative gaps) for all-positive-gap fonts."""
        fonts = client.get("/api/fonts").json()
        anton = next((f for f in fonts if "anton" in f["full_name"].lower()), None)
        if not anton:
            pytest.skip("Anton not installed")
        meta = _overlap(client, anton["id"], mode="medium").json()["overlap_metadata"]
        # For Anton (all gaps positive), medium mode should produce overlap (negative after gaps)
        positive_befores = [(i, b) for i, b in enumerate(meta["gaps_before_mm"]) if b > 0]
        for i, _ in positive_befores:
            assert meta["gaps_after_mm"][i] < 0, (
                f"Pair {i}: expected negative gap after medium overlap, "
                f"got {meta['gaps_after_mm'][i]:.3f} mm"
            )


class TestOverlapNoConnectivity:
    def test_overlap_response_has_no_welding_field(self, client: TestClient, font_id: str) -> None:
        """Overlap Engine must not include connectivity metadata."""
        r = _overlap(client, font_id)
        assert "welding" not in r.json()

    def test_overlap_response_has_no_validation_field(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id)
        assert "validation" not in r.json()

    def test_overlap_response_has_no_bridges(self, client: TestClient, font_id: str) -> None:
        r = _overlap(client, font_id)
        bridge_paths = [
            p for p in r.json().get("paths", [])
            if isinstance(p, dict) and p.get("path_id", "").startswith("bridge-")
        ]
        assert bridge_paths == []

    def test_generate_endpoint_unchanged(self, client: TestClient, font_id: str) -> None:
        """Original /api/generate must still work and return welding metadata."""
        r = client.post("/api/generate", json={
            "text": "Oliver",
            "font_id": font_id,
            "material_id": "cast-acrylic-3mm",
        })
        assert r.status_code == 200
        assert "welding" in r.json()["geometry"]


class TestOverlapEdgeCases:
    def test_single_character_unchanged(self, client: TestClient, font_id: str) -> None:
        r = client.post("/api/overlap", json={"text": "A", "font_id": font_id})
        assert r.status_code == 200
        meta = r.json()["overlap_metadata"]
        assert meta["gaps_before_mm"] == []
        assert meta["gaps_after_mm"] == []

    def test_empty_text_rejected(self, client: TestClient, font_id: str) -> None:
        r = client.post("/api/overlap", json={"text": "   ", "font_id": font_id})
        assert r.status_code == 400

    def test_unknown_font_rejected(self, client: TestClient) -> None:
        r = client.post("/api/overlap", json={"text": "Oliver", "font_id": "missing-font"})
        assert r.status_code == 400

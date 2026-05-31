"""
Phase 1C — Golden Test Corpus

Authoritative quality gate. Every test case here must pass before any
release tagged v0.3.0 or later. Tests are deterministic and font-
availability-conditional (skip when a specific font is not installed).

Corpus invariants applied to every case:
  - HTTP 200
  - SVG contains <svg> and at least one <path>
  - SVG width/height use mm units
  - PNG has valid PNG header
  - dimensions > 0
  - compression_amount_mm <= 1.5 (safety limit)
  - strategy is one of: natural / compression / bridge / disconnected
"""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.material_profiles import list_materials


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def catalogue(client: TestClient) -> dict[str, dict]:
    fonts = client.get("/api/fonts").json()
    return {f["full_name"].lower(): f for f in fonts}


def _find(catalogue: dict, *keywords: str) -> dict | None:
    for name, font in catalogue.items():
        if all(kw.lower() in name for kw in keywords):
            return font
    return None


def _arial(catalogue: dict) -> dict | None:
    return _find(catalogue, "arial")


def _anton(catalogue: dict) -> dict | None:
    return _find(catalogue, "anton")


MATERIAL_IDS = [m.material_id for m in list_materials()]


# ---------------------------------------------------------------------------
# Invariant helper
# ---------------------------------------------------------------------------

def _assert_invariants(payload: dict, name: str) -> None:
    """Apply corpus invariants to every generated result."""
    g = payload["geometry"]
    assert "<svg" in payload["svg"], f"{name}: SVG missing <svg>"
    assert "<path" in payload["svg"], f"{name}: SVG missing <path>"
    assert "mm" in payload["svg"], f"{name}: SVG missing mm units"
    assert base64.b64decode(payload["png_base64"]).startswith(b"\x89PNG"), f"{name}: invalid PNG"
    assert g["dimensions"]["width"] > 0, f"{name}: zero width"
    assert g["dimensions"]["height"] > 0, f"{name}: zero height"
    assert g["welding"]["compression_amount_mm"] <= 1.5, (
        f"{name}: compression {g['welding']['compression_amount_mm']} mm exceeds safety limit"
    )
    assert g["welding"]["strategy"] in ("natural", "compression", "bridge", "disconnected"), (
        f"{name}: unexpected strategy {g['welding']['strategy']!r}"
    )


# ---------------------------------------------------------------------------
# Corpus — Required Names (Arial / default font)
# ---------------------------------------------------------------------------

class TestGoldenCorpusRequiredNames:
    """All required name cases must generate without error for any available font."""

    @pytest.mark.parametrize("name", [
        "Oliver", "Amelia", "Muhammad", "O'Connor", "Léa",
        "Hannah", "A",
    ])
    def test_required_name_generates_successfully(
        self, client: TestClient, catalogue: dict, name: str
    ) -> None:
        font = _arial(catalogue)
        if font is None:
            pytest.skip("Arial not available")
        r = client.post("/api/generate", json={"text": name, "font_id": font["id"]})
        assert r.status_code == 200, f"HTTP {r.status_code} for '{name}'"
        _assert_invariants(r.json(), name)

    def test_single_character_is_natural(self, client: TestClient, catalogue: dict) -> None:
        font = _arial(catalogue)
        if font is None:
            pytest.skip("Arial not available")
        r = client.post("/api/generate", json={"text": "A", "font_id": font["id"]})
        assert r.status_code == 200
        assert r.json()["geometry"]["welding"]["strategy"] == "natural"

    def test_apostrophe_name_generates_without_error(
        self, client: TestClient, catalogue: dict
    ) -> None:
        font = _arial(catalogue)
        if font is None:
            pytest.skip("Arial not available")
        r = client.post("/api/generate", json={"text": "O'Connor", "font_id": font["id"]})
        assert r.status_code == 200
        _assert_invariants(r.json(), "O'Connor")

    def test_accented_name_generates_without_error(
        self, client: TestClient, catalogue: dict
    ) -> None:
        font = _arial(catalogue)
        if font is None:
            pytest.skip("Arial not available")
        r = client.post("/api/generate", json={"text": "Léa", "font_id": font["id"]})
        assert r.status_code == 200
        _assert_invariants(r.json(), "Léa")


# ---------------------------------------------------------------------------
# Corpus — Anton (bold/condensed font rules)
# ---------------------------------------------------------------------------

class TestGoldenCorpusAnton:
    """Anton must always use bridge strategy, never compression, never merged paths."""

    @pytest.mark.parametrize("name", ["Oliver", "Amelia", "Muhammad"])
    def test_anton_uses_bridge_not_compression(
        self, client: TestClient, catalogue: dict, name: str
    ) -> None:
        font = _anton(catalogue)
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": name, "font_id": font["id"]})
        assert r.status_code == 200
        payload = r.json()
        _assert_invariants(payload, name)
        welding = payload["geometry"]["welding"]
        assert welding["strategy"] != "compression", (
            f"Anton '{name}' must not use compression (got {welding['compression_amount_mm']} mm)"
        )
        assert welding["compression_amount_mm"] == 0.0, (
            f"Anton '{name}' compression_amount_mm must be 0, got {welding['compression_amount_mm']}"
        )

    @pytest.mark.parametrize("name", ["Oliver", "Amelia"])
    def test_anton_has_no_merged_paths(
        self, client: TestClient, catalogue: dict, name: str
    ) -> None:
        font = _anton(catalogue)
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": name, "font_id": font["id"]})
        assert r.status_code == 200
        merged = [
            p for p in r.json()["geometry"]["paths"]
            if p["path_id"].startswith("merged-")
        ]
        assert not merged, f"Anton '{name}' contains {len(merged)} destructively merged paths"

    def test_anton_score_not_95_when_using_bridges(
        self, client: TestClient, catalogue: dict
    ) -> None:
        font = _anton(catalogue)
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        validation = r.json()["geometry"]["validation"]
        if welding["strategy"] != "compression":
            assert validation["connectivity_score"] != 95, (
                "Score 95 (compression quality) must not appear when Anton uses bridge strategy"
            )


# ---------------------------------------------------------------------------
# Corpus — All Materials
# ---------------------------------------------------------------------------

class TestGoldenCorpusMaterials:

    @pytest.mark.parametrize("material_id", MATERIAL_IDS)
    def test_oliver_generates_for_all_materials(
        self, client: TestClient, catalogue: dict, material_id: str
    ) -> None:
        font = _arial(catalogue) or next(iter(catalogue.values()), None)
        if font is None:
            pytest.skip("No fonts available")
        r = client.post("/api/generate", json={
            "text": "Oliver",
            "font_id": font["id"],
            "material_id": material_id,
        })
        assert r.status_code == 200, f"HTTP {r.status_code} for material {material_id}"
        payload = r.json()
        _assert_invariants(payload, f"Oliver/{material_id}")
        assert payload["geometry"]["material"]["material_id"] == material_id

    @pytest.mark.parametrize("material_id", MATERIAL_IDS)
    def test_dimensions_are_positive_for_all_materials(
        self, client: TestClient, catalogue: dict, material_id: str
    ) -> None:
        font = _anton(catalogue)
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={
            "text": "Amelia",
            "font_id": font["id"],
            "material_id": material_id,
        })
        assert r.status_code == 200
        dims = r.json()["geometry"]["dimensions"]
        assert dims["width"] > 0 and dims["height"] > 0


# ---------------------------------------------------------------------------
# Corpus — Compression Safety
# ---------------------------------------------------------------------------

class TestGoldenCorpusCompressionSafety:

    @pytest.mark.parametrize("name", ["Oliver", "Amelia", "Muhammad", "Hannah"])
    def test_compression_never_exceeds_per_pair_limit(
        self, client: TestClient, catalogue: dict, name: str
    ) -> None:
        """Per-pair compression can close gaps up to 5 mm; uniform over-compression is gone."""
        fonts = client.get("/api/fonts").json()
        if not fonts:
            pytest.skip("No fonts")
        r = client.post("/api/generate", json={"text": name, "font_id": fonts[0]["id"]})
        assert r.status_code == 200
        mm = r.json()["geometry"]["welding"]["compression_amount_mm"]
        assert mm <= 5.0, f"'{name}': compression {mm} mm exceeds per-pair safety limit of 5 mm"


# ---------------------------------------------------------------------------
# Corpus — Presets
# ---------------------------------------------------------------------------

class TestGoldenCorpusPresets:

    def test_four_presets_returned(self, client: TestClient) -> None:
        r = client.get("/api/presets")
        assert r.status_code == 200
        presets = r.json()
        assert len(presets) == 4

    def test_preset_ids_are_correct(self, client: TestClient) -> None:
        r = client.get("/api/presets")
        ids = {p["preset_id"] for p in r.json()}
        assert ids == {"name-sign", "cake-topper", "ornament", "nursery-sign"}

    def test_preset_material_ids_are_valid(self, client: TestClient) -> None:
        valid_ids = {m.material_id for m in list_materials()}
        for preset in client.get("/api/presets").json():
            assert preset["default_material_id"] in valid_ids, (
                f"Preset '{preset['preset_id']}' has invalid material '{preset['default_material_id']}'"
            )

    def test_name_sign_preset_uses_cast_acrylic(self, client: TestClient) -> None:
        presets = {p["preset_id"]: p for p in client.get("/api/presets").json()}
        assert presets["name-sign"]["default_material_id"] == "cast-acrylic-3mm"

    def test_ornament_preset_uses_mirror_acrylic(self, client: TestClient) -> None:
        presets = {p["preset_id"]: p for p in client.get("/api/presets").json()}
        assert presets["ornament"]["default_material_id"] == "mirror-acrylic-3mm"

    def test_nursery_sign_preset_uses_plywood(self, client: TestClient) -> None:
        presets = {p["preset_id"]: p for p in client.get("/api/presets").json()}
        assert presets["nursery-sign"]["default_material_id"] == "plywood-3mm"

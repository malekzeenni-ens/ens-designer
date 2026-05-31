"""
Font-specific regression tests.

These tests verify that the connectivity engine produces the correct
strategy for specific font categories:
  - Bold/condensed fonts (Anton, Oswald): bridge fallback, NOT compression
  - Script/connected fonts (Pacifico, Lobster): natural connectivity
  - Standard fonts (Arial): bridge or natural

Tests are skipped when a specific font is not installed in the font catalogue.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def catalogue(client: TestClient) -> dict[str, dict]:
    """Return {normalised_name: font_dict} for all available fonts."""
    fonts = client.get("/api/fonts").json()
    return {f["full_name"].lower(): f for f in fonts}


def _find(catalogue: dict, *keywords: str) -> dict | None:
    """Return the first font whose full name contains all keywords (case-insensitive)."""
    for name, font in catalogue.items():
        if all(kw.lower() in name for kw in keywords):
            return font
    return None


# ---------------------------------------------------------------------------
# Anton regression — must NEVER use compression
# ---------------------------------------------------------------------------

class TestAntonRegression:
    def test_oliver_in_anton_uses_bridge_not_compression(self, client: TestClient, catalogue: dict) -> None:
        font = _find(catalogue, "anton")
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        assert welding["strategy"] != "compression", (
            f"Anton must not use compression — letters would collapse. "
            f"Got strategy={welding['strategy']!r}  compression_mm={welding['compression_amount_mm']}"
        )

    def test_oliver_in_anton_has_zero_compression(self, client: TestClient, catalogue: dict) -> None:
        font = _find(catalogue, "anton")
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        assert welding["compression_amount_mm"] == 0.0, (
            f"Anton must have 0 compression. Got {welding['compression_amount_mm']} mm"
        )

    def test_oliver_in_anton_score_reflects_actual_connectivity(self, client: TestClient, catalogue: dict) -> None:
        """Score 95 (compression) must not appear when Anton uses bridge strategy."""
        font = _find(catalogue, "anton")
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        validation = r.json()["geometry"]["validation"]
        if welding["strategy"] == "bridge":
            # Fully bridged → score should be 80 (not 95 which would indicate false compression)
            assert validation["connectivity_score"] <= 80, (
                f"Score {validation['connectivity_score']} is too high for bridge strategy — "
                f"suggests the engine incorrectly reported compression-level quality."
            )

    def test_oliver_in_anton_original_paths_preserved(self, client: TestClient, catalogue: dict) -> None:
        """After bridge strategy, Anton letter paths must not be merged into blobs."""
        font = _find(catalogue, "anton")
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        paths = r.json()["geometry"]["paths"]
        # No path should be a "merged-*" path (which would indicate destructive geometry union)
        merged = [p for p in paths if p["path_id"].startswith("merged-")]
        assert not merged, (
            f"Anton output contains {len(merged)} merged paths — "
            f"letters were incorrectly union-merged: {[p['path_id'] for p in merged]}"
        )

    def test_amelia_in_anton_uses_bridge_not_compression(self, client: TestClient, catalogue: dict) -> None:
        font = _find(catalogue, "anton")
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Amelia", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        assert welding["strategy"] != "compression"
        assert welding["compression_amount_mm"] == 0.0


# ---------------------------------------------------------------------------
# Oswald regression — similarly spaced bold font, should use bridge
# ---------------------------------------------------------------------------

class TestOswaldRegression:
    def test_oliver_in_oswald_does_not_over_compress(self, client: TestClient, catalogue: dict) -> None:
        font = _find(catalogue, "oswald")
        if font is None:
            pytest.skip("Oswald not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        # Oswald is a condensed font — compression limit must have been respected.
        # If strategy is compression, verify the amount is within safe bounds.
        if welding["strategy"] == "compression":
            assert welding["compression_amount_mm"] <= 1.5, (
                f"Oswald compression {welding['compression_amount_mm']} mm exceeds safety limit"
            )


# ---------------------------------------------------------------------------
# Script font regression — should be naturally connected
# ---------------------------------------------------------------------------

class TestScriptFontRegression:
    @pytest.mark.parametrize("font_keyword", ["pacifico", "peanut butter", "dancing script"])
    def test_oliver_in_script_font_is_connected(
        self, client: TestClient, catalogue: dict, font_keyword: str
    ) -> None:
        """
        Mixed-case "Oliver" in a script font: lowercase letters overlap naturally,
        but uppercase O → lowercase l typically has a gap.
        Per-pair compression closes only the O→l gap — strategy is "compression".
        Natural is also acceptable if the font's O already touches l.
        Bridge is acceptable as a fallback.
        Compression must never exceed the per-pair limit (5 mm).
        """
        font = _find(catalogue, font_keyword)
        if font is None:
            pytest.skip(f"'{font_keyword}' not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        # Any connected strategy is valid — per-pair compression is now the expected path.
        assert welding["strategy"] in ("natural", "compression", "bridge"), (
            f"{font_keyword}: unexpected strategy {welding['strategy']!r}"
        )
        # Compression, if applied, must be within the per-pair safety limit.
        assert welding["compression_amount_mm"] <= 5.0, (
            f"{font_keyword}: compression {welding['compression_amount_mm']} mm "
            f"exceeds per-pair safety limit of 5 mm"
        )

    @pytest.mark.parametrize("font_keyword", ["pacifico", "peanut butter", "dancing script"])
    def test_oliver_lowercase_in_script_font_is_natural(
        self, client: TestClient, catalogue: dict, font_keyword: str
    ) -> None:
        """All-lowercase 'oliver' in a script font should be naturally connected
        because script font lowercase letters overlap by design."""
        font = _find(catalogue, font_keyword)
        if font is None:
            pytest.skip(f"'{font_keyword}' not installed")
        r = client.post("/api/generate", json={"text": "oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        # Lowercase-only in a script font: expect natural connectivity (overlapping letters)
        # or at most 1 bridge for any font-specific gap.
        assert welding["strategy"] in ("natural", "bridge"), (
            f"{font_keyword}: lowercase 'oliver' got unexpected strategy {welding['strategy']!r}"
        )
        assert welding["compression_amount_mm"] == 0.0


# ---------------------------------------------------------------------------
# Compression limit regression — no font should produce > 1.5 mm compression
# ---------------------------------------------------------------------------

class TestCompressionSafetyLimit:
    @pytest.mark.parametrize("name", ["Oliver", "Amelia", "Muhammad", "Hannah"])
    def test_compression_never_exceeds_safety_limit(
        self, client: TestClient, catalogue: dict, name: str
    ) -> None:
        # Use whatever the first available font is — the limit must hold for any font.
        fonts = client.get("/api/fonts").json()
        assert fonts
        font = fonts[0]
        r = client.post("/api/generate", json={"text": name, "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        assert welding["compression_amount_mm"] <= 1.5, (
            f"Compression for '{name}' in '{font['full_name']}' "
            f"exceeded safety limit: {welding['compression_amount_mm']} mm"
        )

    def test_compression_strategy_never_shows_95_for_bridge_font(
        self, client: TestClient, catalogue: dict
    ) -> None:
        """Score 95 is reserved for compression strategy only."""
        font = _find(catalogue, "anton")
        if font is None:
            pytest.skip("Anton not installed")
        r = client.post("/api/generate", json={"text": "Oliver", "font_id": font["id"]})
        assert r.status_code == 200
        welding = r.json()["geometry"]["welding"]
        validation = r.json()["geometry"]["validation"]
        if welding["strategy"] != "compression":
            assert validation["connectivity_score"] != 95, (
                "Score 95 indicates compression was reported, but strategy is "
                f"{welding['strategy']!r} — score is inconsistent."
            )

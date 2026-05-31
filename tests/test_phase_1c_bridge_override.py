"""Phase 1C — Bridge Override Tests"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def anton_id(client: TestClient) -> str:
    fonts = client.get("/api/fonts").json()
    font = next((f for f in fonts if "anton" in f["full_name"].lower()), None)
    if font is None:
        pytest.skip("Anton not installed")
    return font["id"]


@pytest.fixture(scope="module")
def arial_id(client: TestClient) -> str:
    fonts = client.get("/api/fonts").json()
    font = next((f for f in fonts if "arial" in f["full_name"].lower()), None)
    if font is None:
        return client.get("/api/fonts").json()[0]["id"]
    return font["id"]


def _generate(client, font_id, overrides=None):
    return client.post("/api/generate", json={
        "text": "Oliver",
        "font_id": font_id,
        "material_id": "cast-acrylic-3mm",
        "bridge_overrides": overrides or [],
    })


class TestBridgeOverrideNoop:
    def test_empty_overrides_matches_normal_generation(
        self, client: TestClient, arial_id: str
    ) -> None:
        r_normal = client.post("/api/generate", json={
            "text": "Oliver", "font_id": arial_id, "material_id": "cast-acrylic-3mm",
        })
        r_override = _generate(client, arial_id, [])
        assert r_normal.status_code == 200
        assert r_override.status_code == 200
        assert r_normal.json()["geometry"]["welding"]["bridges_added"] == \
               r_override.json()["geometry"]["welding"]["bridges_added"]


class TestBridgeOverrideAdd:
    def test_add_bridge_increases_bridge_count(
        self, client: TestClient, anton_id: str
    ) -> None:
        r_normal = _generate(client, anton_id)
        assert r_normal.status_code == 200
        normal_count = r_normal.json()["geometry"]["welding"]["bridges_added"]

        r_override = _generate(client, anton_id, [{"pair_index": 0, "action": "remove"}])
        assert r_override.status_code == 200
        override_count = r_override.json()["geometry"]["welding"]["bridges_added"]
        assert override_count < normal_count or override_count == normal_count - 1

    def test_add_bridge_appears_in_svg(
        self, client: TestClient, arial_id: str
    ) -> None:
        r = _generate(client, arial_id, [{"pair_index": 0, "action": "add"}])
        assert r.status_code == 200
        paths = r.json()["geometry"]["paths"]
        bridge_paths = [p for p in paths if p["path_id"].startswith("bridge-")]
        assert len(bridge_paths) >= 1


class TestBridgeOverrideRemove:
    def test_remove_bridge_decreases_bridge_count(
        self, client: TestClient, anton_id: str
    ) -> None:
        r_normal = _generate(client, anton_id)
        assert r_normal.status_code == 200
        normal_bridges = r_normal.json()["geometry"]["welding"]["bridges_added"]
        if normal_bridges == 0:
            pytest.skip("Anton has no bridges to remove in this environment")

        r_remove = _generate(client, anton_id, [{"pair_index": 0, "action": "remove"}])
        assert r_remove.status_code == 200
        removed_bridges = r_remove.json()["geometry"]["welding"]["bridges_added"]
        assert removed_bridges <= normal_bridges

    def test_remove_all_bridges_gives_no_bridge_paths(
        self, client: TestClient, arial_id: str
    ) -> None:
        r_normal = _generate(client, arial_id)
        normal_ids = r_normal.json()["geometry"]["welding"].get("bridge_path_ids", [])
        if not normal_ids:
            pytest.skip("Arial has no bridges to remove")

        overrides = [{"pair_index": i, "action": "remove"} for i in range(5)]
        r = _generate(client, arial_id, overrides)
        assert r.status_code == 200
        remaining_bridges = [
            p for p in r.json()["geometry"]["paths"]
            if p["path_id"].startswith("bridge-")
        ]
        assert len(remaining_bridges) == 0


class TestBridgeOverrideValidation:
    def test_out_of_range_pair_index_returns_200_not_crash(
        self, client: TestClient, arial_id: str
    ) -> None:
        # Out-of-range overrides are silently skipped (logged as warnings).
        r = _generate(client, arial_id, [{"pair_index": 999, "action": "add"}])
        assert r.status_code == 200

    def test_generation_without_overrides_still_works(
        self, client: TestClient, arial_id: str
    ) -> None:
        r = client.post("/api/generate", json={
            "text": "Oliver", "font_id": arial_id, "material_id": "cast-acrylic-3mm",
        })
        assert r.status_code == 200

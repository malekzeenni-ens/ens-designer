from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.material_profiles import list_materials


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def font_id(client: TestClient) -> str:
    fonts = client.get("/api/fonts").json()
    preferred = next((font for font in fonts if "arial" in font["full_name"].lower()), fonts[0])
    return preferred["id"]


def test_material_profiles_are_available(client: TestClient) -> None:
    response = client.get("/api/materials")

    assert response.status_code == 200
    materials = response.json()
    assert {material["material_id"] for material in materials} == {
        "cast-acrylic-3mm",
        "mirror-acrylic-3mm",
        "plywood-3mm",
    }


@pytest.mark.parametrize("material_id", [material.material_id for material in list_materials()])
def test_generate_with_material_validation(client: TestClient, font_id: str, material_id: str) -> None:
    response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id, "material_id": material_id})

    assert response.status_code == 200
    geometry = response.json()["geometry"]
    assert geometry["material"]["material_id"] == material_id
    assert geometry["welding"]["enabled"] is True
    assert geometry["welding"]["connected_components_after"] <= geometry["welding"]["connected_components_before"]
    assert geometry["validation"]["connectivity_score"] >= 0
    assert geometry["validation"]["structural_score"] >= 0
    assert geometry["validation"]["production_readiness_score"] >= 0


def test_unknown_material_is_rejected(client: TestClient, font_id: str) -> None:
    response = client.post("/api/generate", json={"text": "Oliver", "font_id": font_id, "material_id": "steel-10mm"})

    assert response.status_code == 400


def test_welding_can_be_disabled(client: TestClient, font_id: str) -> None:
    response = client.post(
        "/api/generate",
        json={"text": "Oliver", "font_id": font_id, "material_id": "cast-acrylic-3mm", "welding_enabled": False},
    )

    assert response.status_code == 200
    welding = response.json()["geometry"]["welding"]
    assert welding["enabled"] is False
    assert welding["bridges_added"] == 0

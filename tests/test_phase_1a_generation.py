from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.font_loader import EXTERNAL_FONT_LIBRARY
from app.font_loader import _font_key
from app.main import create_app
from app.unicode_normalisation import normalise_text


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(scope="module")
def font_id(client: TestClient) -> str:
    response = client.get("/api/fonts")
    assert response.status_code == 200
    fonts = response.json()
    assert fonts
    preferred = next((font for font in fonts if "arial" in font["full_name"].lower()), fonts[0])
    return preferred["id"]


@pytest.mark.parametrize("name", ["Oliver", "Amelia", "Muhammad", "O'Connor", "Léa"])
def test_generate_required_phase_1a_names(client: TestClient, font_id: str, name: str) -> None:
    response = client.post("/api/generate", json={"text": name, "font_id": font_id})

    assert response.status_code == 200
    payload = response.json()
    assert payload["geometry"]["source"]["text"] == name
    assert payload["geometry"]["units"] == "mm"
    assert payload["geometry"]["paths"]
    assert payload["geometry"]["dimensions"]["width"] > 0
    assert payload["geometry"]["dimensions"]["height"] > 0
    assert "<svg" in payload["svg"]
    assert "<path" in payload["svg"]
    assert base64.b64decode(payload["png_base64"]).startswith(b"\x89PNG")


def test_text_is_trimmed_and_normalised(client: TestClient, font_id: str) -> None:
    response = client.post("/api/generate", json={"text": "  Le\u0301a  ", "font_id": font_id})

    assert response.status_code == 200
    assert response.json()["geometry"]["source"]["text"] == "Léa"


def test_empty_text_is_rejected(client: TestClient, font_id: str) -> None:
    response = client.post("/api/generate", json={"text": "   ", "font_id": font_id})

    assert response.status_code == 400


def test_unknown_font_is_rejected(client: TestClient) -> None:
    response = client.post("/api/generate", json={"text": "Oliver", "font_id": "missing-font"})

    assert response.status_code == 400


def test_external_font_library_is_available_when_present(client: TestClient) -> None:
    response = client.get("/api/fonts")

    assert response.status_code == 200
    fonts = response.json()
    if EXTERNAL_FONT_LIBRARY.exists():
        assert any(font["source"] == "external" for font in fonts)


def test_font_catalog_deduplicates_font_names(client: TestClient) -> None:
    response = client.get("/api/fonts")

    assert response.status_code == 200
    fonts = response.json()
    keys = [_font_key(type("Font", (), font)()) for font in fonts]
    assert len(keys) == len(set(keys))


def test_normalise_text_rejects_empty_string() -> None:
    with pytest.raises(ValueError):
        normalise_text("  ")

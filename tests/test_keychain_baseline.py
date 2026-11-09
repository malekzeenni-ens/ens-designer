"""Preserve pre-keychain Cake Topper output across the K1 shared refactor."""
from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pytest

from app.cake_topper_engine import CakeTopperService
from app.font_loader import FontCatalog
from app.models import CakeTopperRequest

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/keychain_baseline"
MANIFEST = json.loads((FIXTURES / "manifest.json").read_text(encoding="utf-8"))


class BaselineDate(date):
    @classmethod
    def today(cls):
        return cls.fromisoformat(MANIFEST["generated_date"])


@pytest.fixture(scope="module")
def service() -> CakeTopperService:
    font = MANIFEST["font"]
    assert hashlib.sha256((ROOT / font["path"]).read_bytes()).hexdigest() == font["sha256"]
    return CakeTopperService(ROOT, FontCatalog(ROOT))


@pytest.mark.parametrize("recipe", MANIFEST["recipes"], ids=lambda recipe: recipe["file"])
def test_cake_topper_svg_unchanged(service: CakeTopperService, recipe: dict) -> None:
    expected = (FIXTURES / recipe["file"]).read_bytes()
    assert hashlib.sha256(expected).hexdigest() == recipe["sha256"], "Reference fixture changed"
    with patch("datetime.date", BaselineDate):
        actual = service.generate(CakeTopperRequest.model_validate(recipe["request"]))
    assert actual.svg.encode("utf-8") == expected

from __future__ import annotations

import unicodedata


def normalise_text(value: str) -> str:
    text = unicodedata.normalize("NFC", value.strip())
    if not text:
        raise ValueError("Text is required.")
    return text

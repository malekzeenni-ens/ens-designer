from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from .models import FontInfo

logger = logging.getLogger(__name__)

FONT_EXTENSIONS = {".ttf", ".otf"}
UPLOAD_MANIFEST = ".uploaded_manifest.json"
MANUAL_FONTS_MANIFEST = ".manual_fonts.json"


@dataclass(frozen=True)
class FontRecord:
    info: FontInfo
    path: Path


class FontCatalog:
    def __init__(self, project_root: Path) -> None:
        self.project_root = project_root
        self._records: dict[str, FontRecord] | None = None

    def list_fonts(self) -> list[FontInfo]:
        return [record.info for record in self._scan().values()]

    def get_font_path(self, font_id: str) -> Path:
        records = self._scan()
        if font_id not in records:
            raise ValueError("Selected font was not found.")
        return records[font_id].path

    def get_font_info(self, font_id: str) -> FontInfo:
        records = self._scan()
        if font_id not in records:
            raise ValueError("Selected font was not found.")
        return records[font_id].info

    def _scan(self) -> dict[str, FontRecord]:
        if self._records is not None:
            return self._records

        parsed: list[FontRecord] = []
        legacy_to_new: dict[str, str] = {}
        for source, directory in self._font_directories():
            if not directory.exists():
                continue
            for path in directory.rglob("*"):
                if path.suffix.lower() not in FONT_EXTENSIONS or not path.is_file():
                    continue
                record = self._read_font(source, path)
                if record is None:
                    continue
                legacy_to_new[_legacy_font_id(path)] = record.info.id
                parsed.append(record)

        known_ids = {record.info.id for record in parsed}
        manual_ids = set(self._migrate_manifest_ids(MANUAL_FONTS_MANIFEST, "manual", legacy_to_new, known_ids))
        self._migrate_manifest_ids(UPLOAD_MANIFEST, "uploaded", legacy_to_new, known_ids)

        records: dict[str, FontRecord] = {}
        seen_names: dict[tuple[str, str], str] = {}
        for record in parsed:
            key = _font_key(record.info)
            existing_id = seen_names.get(key)
            if existing_id is None:
                seen_names[key] = record.info.id
                records[record.info.id] = record
                continue
            if record.info.id in manual_ids and existing_id not in manual_ids:
                records.pop(existing_id, None)
                seen_names[key] = record.info.id
                records[record.info.id] = record

        self._records = dict(sorted(records.items(), key=lambda item: item[1].info.full_name.lower()))
        return self._records

    def _migrate_manifest_ids(
        self,
        manifest_name: str,
        key: str,
        legacy_to_new: dict[str, str],
        known_ids: set[str],
    ) -> list[str]:
        """Remap stale path-hash font IDs to content-hash IDs, dropping any that no longer resolve."""
        raw_ids = self._read_manifest_ids(manifest_name, key)
        if not raw_ids:
            return raw_ids

        migrated_ids: list[str] = []
        dropped: list[str] = []
        changed = False
        for font_id in raw_ids:
            if font_id in known_ids:
                migrated_ids.append(font_id)
                continue
            remapped = legacy_to_new.get(font_id)
            if remapped is not None:
                migrated_ids.append(remapped)
                changed = True
                continue
            dropped.append(font_id)
            changed = True

        if dropped:
            logger.warning(
                "%s: dropping %d font id(s) with no matching font file: %s",
                manifest_name,
                len(dropped),
                ", ".join(dropped),
            )

        if changed:
            manifest_path = self.project_root / "fonts" / manifest_name
            manifest_path.write_text(json.dumps({key: migrated_ids}, indent=2), encoding="utf-8")

        return migrated_ids

    def add_font(self, path: Path) -> FontRecord | None:
        """Hot-add a font to the live catalog without restarting.

        Returns the new FontRecord on success, or None if the font is a duplicate
        (matched by full_name + style). Raises ValueError if the file cannot be read.
        """
        records = self._scan()
        record = self._read_font("project", path)
        if record is None:
            raise ValueError(f"Could not read font file: {path}")
        if _font_key(record.info) in {_font_key(r.info) for r in records.values()}:
            return None  # duplicate
        records[record.info.id] = record
        self._records = dict(sorted(records.items(), key=lambda item: item[1].info.full_name.lower()))
        return record

    def get_uploaded_font_ids(self) -> list[str]:
        """Return font IDs recorded in the upload manifest."""
        return self._read_manifest_ids(UPLOAD_MANIFEST, "uploaded")

    def record_upload(self, font_id: str) -> None:
        """Persist a font ID to the upload manifest."""
        manifest_path = self.project_root / "fonts" / UPLOAD_MANIFEST
        ids = self.get_uploaded_font_ids()
        if font_id not in ids:
            ids.append(font_id)
        manifest_path.write_text(json.dumps({"uploaded": ids}, indent=2), encoding="utf-8")

    def get_manual_font_ids(self) -> list[str]:
        """Return saved manual font IDs that still exist in the live catalog."""
        records = self._scan()
        raw_ids = self._read_manifest_ids(MANUAL_FONTS_MANIFEST, "manual")
        valid_ids: list[str] = []
        for font_id in raw_ids:
            if font_id in records and font_id not in valid_ids:
                valid_ids.append(font_id)
        return valid_ids

    def list_manual_fonts(self) -> list[FontInfo]:
        records = self._scan()
        return [records[font_id].info for font_id in self.get_manual_font_ids()]

    def save_manual_font_ids(self, font_ids: list[str]) -> list[str]:
        """Persist manual font IDs after de-duping and dropping unknown fonts."""
        records = self._scan()
        valid_ids: list[str] = []
        for font_id in font_ids:
            if font_id in records and font_id not in valid_ids:
                valid_ids.append(font_id)
        manifest_path = self.project_root / "fonts" / MANUAL_FONTS_MANIFEST
        manifest_path.write_text(json.dumps({"manual": valid_ids}, indent=2), encoding="utf-8")
        return valid_ids

    def _read_manifest_ids(self, manifest_name: str, key: str) -> list[str]:
        manifest_path = self.project_root / "fonts" / manifest_name
        if not manifest_path.exists():
            return []
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("%s: failed to read manifest (%s); treating as empty.", manifest_path, exc)
            return []
        if not isinstance(data, dict):
            logger.warning("%s: manifest root is not an object; treating as empty.", manifest_path)
            return []
        raw_ids = data.get(key, [])
        if not isinstance(raw_ids, list):
            return []
        ids: list[str] = []
        for font_id in raw_ids:
            if isinstance(font_id, str) and font_id not in ids:
                ids.append(font_id)
        return ids

    def _font_directories(self) -> list[tuple[str, Path]]:
        directories: list[tuple[str, Path]] = [("project", self.project_root / "fonts")]
        windows_fonts = Path("C:/Windows/Fonts")
        if windows_fonts.exists():
            directories.append(("system", windows_fonts))
        return directories

    def _read_font(self, source: str, path: Path) -> FontRecord | None:
        if path.suffix.lower() not in FONT_EXTENSIONS or not path.is_file():
            return None

        family, full_name, style = _font_names_from_path(path)

        font_id = _content_font_id(path)
        info = FontInfo(id=font_id, family=family, full_name=full_name, style=style, source=source)  # type: ignore[arg-type]
        return FontRecord(info=info, path=path)


def _content_font_id(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()[:16]


def _legacy_font_id(path: Path) -> str:
    """Old path-hash font ID scheme, kept only to remap stale manifest entries."""
    return hashlib.sha1(str(path.resolve()).encode("utf-8")).hexdigest()[:16]


def _font_key(font: FontInfo) -> tuple[str, str]:
    return (_normalise_name(font.full_name), _normalise_name(font.style))


def _normalise_name(value: str) -> str:
    return " ".join(value.casefold().split())


def _font_names_from_path(path: Path) -> tuple[str, str, str]:
    """Build catalog display metadata without opening every font binary."""
    name = path.stem
    cleaned = name.replace("_", " ").replace("-", " ")
    cleaned = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    style_tokens = {
        "regular": "Regular",
        "bold": "Bold",
        "italic": "Italic",
        "medium": "Medium",
        "semibold": "SemiBold",
        "semi bold": "SemiBold",
        "black": "Black",
        "light": "Light",
        "thin": "Thin",
        "extrabold": "ExtraBold",
        "extra bold": "ExtraBold",
        "extralight": "ExtraLight",
        "extra light": "ExtraLight",
        "demo": "DEMO",
    }

    lower = cleaned.casefold()
    style = "Regular"
    full_name = cleaned or path.stem
    for token, label in sorted(style_tokens.items(), key=lambda item: len(item[0]), reverse=True):
        pattern = rf"(?:^|\s){re.escape(token)}$"
        if re.search(pattern, lower):
            style = label
            full_name = re.sub(pattern, "", full_name, flags=re.IGNORECASE).strip()
            break

    if not full_name:
        full_name = cleaned or path.stem
    family = full_name
    return family, full_name, style

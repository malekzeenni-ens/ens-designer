from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from fontTools.ttLib import TTFont

from .models import FontInfo

FONT_EXTENSIONS = {".ttf", ".otf"}
EXTERNAL_FONT_LIBRARY = Path("C:/Users/malek/Dropbox/_Etch_n_Shine/Fonts")


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

        records: dict[str, FontRecord] = {}
        seen_names: set[tuple[str, str]] = set()
        for source, directory in self._font_directories():
            if not directory.exists():
                continue
            for path in directory.rglob("*"):
                if path.suffix.lower() not in FONT_EXTENSIONS or not path.is_file():
                    continue
                record = self._read_font(source, path)
                if record is not None and _font_key(record.info) not in seen_names:
                    seen_names.add(_font_key(record.info))
                    records[record.info.id] = record

        self._records = dict(sorted(records.items(), key=lambda item: item[1].info.full_name.lower()))
        return self._records

    def _font_directories(self) -> list[tuple[str, Path]]:
        directories: list[tuple[str, Path]] = [("project", self.project_root / "fonts")]
        if EXTERNAL_FONT_LIBRARY.exists():
            directories.append(("external", EXTERNAL_FONT_LIBRARY))
        windows_fonts = Path("C:/Windows/Fonts")
        if windows_fonts.exists():
            directories.append(("system", windows_fonts))
        return directories

    def _read_font(self, source: str, path: Path) -> FontRecord | None:
        try:
            font = TTFont(path, lazy=True)
            names = font["name"]
            family = names.getBestFamilyName() or path.stem
            full_name = names.getBestFullName() or family
            style = names.getBestSubFamilyName() or "Regular"
        except Exception:
            return None
        finally:
            try:
                font.close()
            except Exception:
                pass

        font_id = hashlib.sha1(str(path.resolve()).encode("utf-8")).hexdigest()[:16]
        info = FontInfo(id=font_id, family=family, full_name=full_name, style=style, source=source)  # type: ignore[arg-type]
        return FontRecord(info=info, path=path)


def _font_key(font: FontInfo) -> tuple[str, str]:
    return (_normalise_name(font.full_name), _normalise_name(font.style))


def _normalise_name(value: str) -> str:
    return " ".join(value.casefold().split())

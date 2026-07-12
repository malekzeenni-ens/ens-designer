from __future__ import annotations

import shutil
import tempfile
import unicodedata
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from fontTools.ttLib import TTFont

from ...models import DeleteFontsRequest, FontUploadResponse, ManualFontsRequest, ManualFontsResponse

router = APIRouter(prefix="/api/fonts", tags=["fonts"])

ALLOWED_EXTENSIONS = {".ttf", ".otf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.get("")
def list_fonts(request: Request):
    return request.app.state.font_catalog.list_fonts()


@router.get("/uploaded")
def list_uploaded_fonts(request: Request):
    catalog = request.app.state.font_catalog
    uploaded_ids = catalog.get_uploaded_font_ids()
    all_records = catalog._scan()
    return [all_records[fid].info for fid in uploaded_ids if fid in all_records]


@router.get("/manual", response_model=ManualFontsResponse)
def list_manual_fonts(request: Request):
    catalog = request.app.state.font_catalog
    font_ids = catalog.get_manual_font_ids()
    records = catalog._scan()
    return ManualFontsResponse(
        font_ids=font_ids,
        fonts=[records[font_id].info for font_id in font_ids],
    )


@router.put("/manual", response_model=ManualFontsResponse)
def update_manual_fonts(payload: ManualFontsRequest, request: Request):
    catalog = request.app.state.font_catalog
    font_ids = catalog.save_manual_font_ids(payload.font_ids)
    records = catalog._scan()
    return ManualFontsResponse(
        font_ids=font_ids,
        fonts=[records[font_id].info for font_id in font_ids],
    )


@router.delete("")
def delete_fonts(payload: DeleteFontsRequest, request: Request):
    removed_ids = request.app.state.font_catalog.exclude_font_ids(payload.font_ids)
    return {"removed_ids": removed_ids, "removed_count": len(removed_ids)}


@router.post("/upload", response_model=FontUploadResponse)
async def upload_font(request: Request, file: UploadFile):
    catalog = request.app.state.font_catalog
    project_root: Path = catalog.project_root

    # --- extension check ---
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return FontUploadResponse(
            success=False,
            message=f'"{file.filename}" is not supported. Only .ttf and .otf files can be uploaded.',
        )

    # --- size check (read into memory once) ---
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        return FontUploadResponse(
            success=False,
            message=f'"{file.filename}" exceeds the 10 MB limit. Please use a smaller font file.',
        )

    # --- FontTools validity check using a temp file ---
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        tmp_path.write_bytes(content)

    try:
        tt = TTFont(tmp_path, lazy=True)
        names = tt["name"]
        full_name = names.getBestFullName() or tmp_path.stem
        style = names.getBestSubFamilyName() or "Regular"
        tt.close()
    except Exception:
        tmp_path.unlink(missing_ok=True)
        return FontUploadResponse(
            success=False,
            message=f'"{file.filename}" does not appear to be a valid font file.',
        )

    # --- duplicate check (by full_name + style against live catalog) ---
    from ...font_loader import _font_key, _normalise_name
    from ...models import FontInfo as _FI
    probe = _FI(id="", family="", full_name=full_name, style=style, source="project")  # type: ignore[arg-type]
    existing_records = catalog._scan()
    for rec in existing_records.values():
        if _font_key(rec.info) == _font_key(probe):
            tmp_path.unlink(missing_ok=True)
            return FontUploadResponse(
                success=False,
                is_duplicate=True,
                font=rec.info,
                message=f'"{rec.info.full_name}" is already in the library — no upload needed.',
            )

    # --- save atomically: write to temp then rename into fonts/ ---
    fonts_dir = project_root / "fonts"
    fonts_dir.mkdir(exist_ok=True)
    safe_name = _sanitise_filename(file.filename or f"font{suffix}")
    dest = _unique_path(fonts_dir / safe_name)
    try:
        shutil.move(str(tmp_path), dest)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to save the font file. Please try again.")

    # --- hot-add to live catalog ---
    try:
        record = catalog.add_font(dest)
    except ValueError:
        dest.unlink(missing_ok=True)
        return FontUploadResponse(
            success=False,
            message=f'"{full_name}" could not be added to the library after upload. Please try again.',
        )
    if record is None:
        # Race: another upload of the same font landed between our duplicate check and now.
        dest.unlink(missing_ok=True)
        return FontUploadResponse(
            success=False,
            is_duplicate=True,
            message=f'"{full_name}" is already in the library — no upload needed.',
        )

    # --- persist to manifest ---
    catalog.record_upload(record.info.id)

    return FontUploadResponse(
        success=True,
        font=record.info,
        message=f'"{record.info.full_name}" uploaded successfully. It is now available in the Designer and Font Adviser.',
    )


@router.get("/{font_id}/file")
def get_font_file(font_id: str, request: Request):
    """Serve the raw font binary so the browser can load it for glyph preview."""
    catalog = request.app.state.font_catalog
    try:
        font_path = catalog.get_font_path(font_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Font not found.")
    suffix = font_path.suffix.lower()
    media_type = "font/ttf" if suffix == ".ttf" else "font/otf"
    return FileResponse(path=str(font_path), media_type=media_type)


@router.get("/{font_id}/characters")
def get_font_characters(font_id: str, request: Request):
    """Return every codepoint in the font's cmap with category and display label."""
    catalog = request.app.state.font_catalog
    try:
        font_path = catalog.get_font_path(font_id)
        font_info = catalog.get_font_info(font_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Font not found.")
    try:
        font = TTFont(font_path, lazy=True)
        cmap = font.getBestCmap() or {}
        characters = []
        for codepoint in sorted(cmap.keys()):
            if codepoint < 32:
                continue
            glyph_name = cmap[codepoint]
            char = chr(codepoint)
            category = _categorise_codepoint(codepoint, glyph_name)
            label = _glyph_label(glyph_name, char, codepoint)
            characters.append({
                "codepoint": codepoint,
                "char": char,
                "glyph_name": glyph_name,
                "category": category,
                "label": label,
            })
        font.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read font characters: {exc}")
    return {"font_id": font_id, "font_name": font_info.full_name, "characters": characters}


def _categorise_codepoint(codepoint: int, glyph_name: str) -> str:
    # Private Use Area — infer category from glyph name
    if 0xE000 <= codepoint <= 0xF8FF:
        base = glyph_name.split(".")[0].lower()
        if any(x in glyph_name.lower() for x in ("liga", "dlig", "hlig")):
            return "ligature"
        if any(x in base for x in ("orn", "heart", "star", "flower", "arrow", "bullet", "deco")):
            return "ornament"
        if any(x in glyph_name.lower() for x in ("swsh", "swash", "ss0", "ss1", "ss2", "ss3", "alt")):
            return "alternate"
        # Letter-pair names like "aa", "ar", "ct" are ligatures
        if len(base) >= 2 and base.isalpha():
            return "ligature"
        return "special"
    # Standard Unicode
    try:
        cat = unicodedata.category(chr(codepoint))
        char_name = unicodedata.name(chr(codepoint), "").lower()
    except (ValueError, TypeError):
        return "other"
    if cat == "Lu":
        return "uppercase"
    if cat == "Ll":
        return "lowercase"
    if cat == "Nd":
        return "digits"
    if "ligature" in char_name:
        return "ligature"
    if cat in ("Po", "Ps", "Pe", "Pi", "Pf", "Pd", "Pc"):
        return "punctuation"
    if cat in ("So", "Sm", "Sc", "Sk"):
        return "ornament"
    if cat in ("Lo", "Lt", "Lm"):
        return "other_letter"
    return "other"


def _glyph_label(glyph_name: str, char: str, codepoint: int) -> str:
    if 0xE000 <= codepoint <= 0xF8FF:
        return glyph_name.split(".")[0]
    return char


def _sanitise_filename(name: str) -> str:
    """Keep only safe filename characters."""
    safe = "".join(c for c in name if c.isalnum() or c in "._- ").strip()
    return safe or "uploaded_font"


def _unique_path(path: Path) -> Path:
    """Append a counter if the destination already exists."""
    if not path.exists():
        return path
    stem, suffix = path.stem, path.suffix
    i = 1
    while True:
        candidate = path.with_name(f"{stem}_{i}{suffix}")
        if not candidate.exists():
            return candidate
        i += 1

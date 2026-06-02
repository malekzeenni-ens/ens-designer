from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, UploadFile
from fontTools.ttLib import TTFont

from ...models import FontUploadResponse

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
    record = catalog.add_font(dest)
    if record is None:
        # Shouldn't happen after duplicate check, but handle gracefully
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

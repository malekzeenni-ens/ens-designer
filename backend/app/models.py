from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FontInfo(BaseModel):
    id: str
    family: str
    full_name: str
    style: str
    source: Literal["project", "system", "external"]


class GenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=80)
    font_id: str


class PathCommand(BaseModel):
    type: Literal["M", "L", "Q", "C", "Z"]
    x: float | None = None
    y: float | None = None
    x1: float | None = None
    y1: float | None = None
    x2: float | None = None
    y2: float | None = None


class GeometryPath(BaseModel):
    path_id: str
    commands: list[PathCommand]
    closed: bool


class GlyphGeometry(BaseModel):
    glyph_id: int
    glyph_name: str
    cluster: int
    advance_x: float
    advance_y: float
    offset_x: float
    offset_y: float
    path_ids: list[str]


class Bounds(BaseModel):
    min_x: float
    min_y: float
    max_x: float
    max_y: float


class Dimensions(BaseModel):
    width: float
    height: float


class GeometrySource(BaseModel):
    text: str
    font_id: str
    font_name: str


class CoordinateSystem(BaseModel):
    origin: Literal["top-left"] = "top-left"
    y_axis: Literal["down"] = "down"


class ExportMetadata(BaseModel):
    svg_ready: bool
    png_ready: bool


class CanonicalGeometry(BaseModel):
    geometry_id: str
    source: GeometrySource
    units: Literal["mm"] = "mm"
    coordinate_system: CoordinateSystem
    dimensions: Dimensions
    glyphs: list[GlyphGeometry]
    paths: list[GeometryPath]
    bounds: Bounds
    export_metadata: ExportMetadata


class GenerateResponse(BaseModel):
    geometry: CanonicalGeometry
    svg: str
    png_base64: str
    svg_filename: str
    png_filename: str

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


class FontInfo(BaseModel):
    id: str
    family: str
    full_name: str
    style: str
    source: Literal["project", "system"]


class FontUploadResponse(BaseModel):
    success: bool
    message: str
    font: FontInfo | None = None
    is_duplicate: bool = False


class BridgeOverride(BaseModel):
    pair_index: int = Field(ge=0, description="Zero-based index of the inter-glyph gap to override.")
    action: Literal["add", "remove", "set_width"]
    width_mm: Optional[float] = Field(default=None, gt=0, le=5.0)


class GenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=80)
    font_id: str
    material_id: str = "cast-acrylic-3mm"
    welding_enabled: bool = True
    bridge_overrides: list[BridgeOverride] = Field(default_factory=list)


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


class MaterialProfile(BaseModel):
    material_id: str
    material_name: str
    thickness_mm: float
    minimum_bridge_width_mm: float
    minimum_feature_size_mm: float
    recommended_connection_width_mm: float


class WeldingMetadata(BaseModel):
    strategy: Literal["natural", "compression", "bridge", "disconnected"] = "bridge"
    enabled: bool
    connected_components_before: int
    connected_components_after: int
    bridges_added: int
    bridge_path_ids: list[str]
    bridge_candidates_skipped: int = 0
    compression_amount_mm: float = 0.0


class ValidationWarning(BaseModel):
    code: str
    severity: Literal["info", "warning", "error"]
    message: str


class ValidationReport(BaseModel):
    connectivity_score: int
    structural_score: int
    production_readiness_score: int
    warnings: list[ValidationWarning]


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
    material: MaterialProfile | None = None
    welding: WeldingMetadata | None = None
    validation: ValidationReport | None = None


class GenerateResponse(BaseModel):
    geometry: CanonicalGeometry
    svg: str
    png_base64: str
    svg_filename: str
    png_filename: str


class Preset(BaseModel):
    preset_id: str
    preset_name: str
    default_material_id: str
    description: str


class CakeTopperLineConfig(BaseModel):
    font_id: str
    font_size_mm: float = Field(default=42.0, gt=0, le=300)
    alignment: Literal["left", "center", "right", "manual"] = "center"
    alignment_offset_mm: float = 0.0
    overlap_mode: Literal["auto", "light", "medium", "strong", "custom"] = "medium"
    overlap_custom_mm: Optional[float] = Field(default=None, gt=0, le=10.0)
    gap_configs: list["OverlapGapConfig"] = Field(default_factory=list)
    floating_offsets: list[FloatingComponentOffset] = Field(default_factory=list)
    manual_x_offset_mm: float = 0.0
    manual_y_offset_mm: float = 0.0
    color: str = Field(default="#000000", pattern=HEX_COLOR_PATTERN)


class CakeTopperRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200)
    default_font_id: str
    default_font_size_mm: float = Field(default=42.0, gt=0, le=300)
    default_overlap_mode: Literal["auto", "light", "medium", "strong", "custom"] = "medium"
    default_overlap_custom_mm: Optional[float] = Field(default=None, gt=0, le=10.0)
    line_configs: list[CakeTopperLineConfig] = Field(default_factory=list)
    inter_line_gaps_mm: list[float] = Field(default_factory=list)
    stake_config: "CakeTopperStakeConfig" = Field(default_factory=lambda: CakeTopperStakeConfig())
    outline_enabled: bool = False
    outline_width_mm: float = Field(default=3.0, gt=0, le=50.0)
    outline_color: str = Field(default="#000000", pattern=HEX_COLOR_PATTERN)


class CakeTopperLineMetadata(BaseModel):
    text: str
    glyph_chars: list[str]
    gaps_before_mm: list[float]
    gaps_after_mm: list[float]
    width_mm: float
    height_mm: float
    x_offset_mm: float
    y_offset_mm: float = 0.0
    manual_x_offset_mm: float = 0.0
    manual_y_offset_mm: float = 0.0
    floating_components: list[FloatingComponentInfo] = Field(default_factory=list)
    color: str = "#000000"
    font_name: str = ""
    font_size_mm: float = 42.0


class CakeTopperStakeOffset(BaseModel):
    stake_index: int = Field(ge=0, le=1)
    x_offset_mm: float = 0.0
    y_offset_mm: float = 0.0


class CakeTopperStakeConfig(BaseModel):
    count: Literal[0, 1, 2] = 0
    width_mm: float = Field(default=3.0, gt=0, le=20.0)
    length_mm: float = Field(default=50.0, gt=0, le=150.0)
    overlap_mm: float = Field(default=2.0, ge=0, le=20.0)
    offsets: list[CakeTopperStakeOffset] = Field(default_factory=list)


class CakeTopperStakeMetadata(BaseModel):
    stake_index: int
    width_mm: float
    length_mm: float
    x_offset_mm: float
    y_offset_mm: float
    manual_x_offset_mm: float = 0.0
    manual_y_offset_mm: float = 0.0


class CakeTopperOutlineMetadata(BaseModel):
    width_mm: float
    color: str


class CakeTopperMetadata(BaseModel):
    words: list[str]
    lines: list[CakeTopperLineMetadata]
    stakes: list[CakeTopperStakeMetadata] = Field(default_factory=list)
    inter_line_gaps_mm: list[float]
    canvas_width_mm: float
    canvas_height_mm: float
    outline: Optional[CakeTopperOutlineMetadata] = None


class CakeTopperResponse(BaseModel):
    svg: str
    png_base64: str
    svg_filename: str
    png_filename: str
    warnings: list[str] = Field(default_factory=list)
    metadata: CakeTopperMetadata


class FloatingComponentOffset(BaseModel):
    glyph_index: int = Field(ge=0)
    x_offset_mm: float = 0.0
    y_offset_mm: float = 0.0


class FloatingComponentInfo(BaseModel):
    glyph_index: int
    char: str


class OverlapGapConfig(BaseModel):
    pair_index: int = Field(ge=0, description="Zero-based index of the inter-glyph gap.")
    enabled: bool = True
    overlap_mm: float = Field(gt=0, le=10.0, description="Overlap to apply for this specific gap.")


class OverlapRequest(BaseModel):
    text: str = Field(min_length=1, max_length=80)
    font_id: str
    overlap_mode: Literal["auto", "light", "medium", "strong", "custom"] = "medium"
    overlap_custom_mm: Optional[float] = Field(default=None, gt=0, le=10.0)
    gap_configs: list[OverlapGapConfig] = Field(default_factory=list,
        description="Per-gap overrides. Empty = apply global mode to all gaps.")
    floating_offsets: list[FloatingComponentOffset] = Field(default_factory=list)


class OverlapMetadata(BaseModel):
    mode: str
    target_overlap_mm: float
    glyph_chars: list[str]
    gaps_before_mm: list[float]
    gaps_after_mm: list[float]
    floating_components: list[FloatingComponentInfo] = Field(default_factory=list)


class OverlapResponse(BaseModel):
    svg: str
    png_base64: str
    svg_filename: str
    png_filename: str
    overlap_metadata: OverlapMetadata
    dimensions: dict

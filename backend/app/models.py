from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


class FontInfo(BaseModel):
    id: str
    family: str
    full_name: str
    style: str
    source: Literal["project", "system"]
    aliases: list[str] = Field(default_factory=list)


class FontUploadResponse(BaseModel):
    success: bool
    message: str
    font: FontInfo | None = None
    is_duplicate: bool = False


class ManualFontsRequest(BaseModel):
    font_ids: list[str] = Field(default_factory=list)


class DeleteFontsRequest(BaseModel):
    font_ids: list[str] = Field(default_factory=list)


class ManualFontsResponse(BaseModel):
    font_ids: list[str]
    fonts: list[FontInfo]


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
    stroke_buffer_mm: float = Field(default=0.0, ge=0.0, le=0.6)


class CakeTopperRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200)
    default_font_id: str
    default_font_size_mm: float = Field(default=42.0, gt=0, le=300)
    default_overlap_mode: Literal["auto", "light", "medium", "strong", "custom"] = "medium"
    default_overlap_custom_mm: Optional[float] = Field(default=None, gt=0, le=10.0)
    line_configs: list[CakeTopperLineConfig] = Field(default_factory=list)
    inter_line_gaps_mm: list[float] = Field(default_factory=list)
    stake_config: "CakeTopperStakeConfig" = Field(default_factory=lambda: CakeTopperStakeConfig())
    ring_config: "CakeTopperRingConfig" = Field(default_factory=lambda: CakeTopperRingConfig())
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


class CakeTopperRingConfig(BaseModel):
    enabled: bool = False
    position: Literal["top-left", "top-center", "top-right", "left", "right", "custom"] = "top-left"
    outer_diameter_mm: float = Field(default=12.0, ge=10.0, le=15.0)
    hole_diameter_mm: float = Field(default=5.0, ge=4.0, le=6.0)
    overlap_mm: float = Field(default=5.0, ge=0.0, le=20.0)
    x_offset_mm: float = 0.0
    y_offset_mm: float = 0.0
    min_wall_thickness_mm: float = Field(default=3.0, gt=0.0, le=10.0)
    min_neck_width_mm: float = Field(default=5.0, gt=0.0, le=20.0)


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


class CakeTopperRingMetadata(BaseModel):
    enabled: bool
    position: str
    center_x_mm: float
    center_y_mm: float
    outer_diameter_mm: float
    hole_diameter_mm: float
    outer_radius_mm: float
    hole_radius_mm: float
    x_offset_mm: float
    y_offset_mm: float
    wall_thickness_mm: float
    neck_width_mm: float | None = None
    is_valid: bool
    warnings: list[str] = Field(default_factory=list)


class CakeTopperMetadata(BaseModel):
    words: list[str]
    lines: list[CakeTopperLineMetadata]
    stakes: list[CakeTopperStakeMetadata] = Field(default_factory=list)
    ring: Optional[CakeTopperRingMetadata] = None
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
    overlap_mm: float = Field(gt=0, le=30.0, description="Overlap to apply for this specific gap.")


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


class HistoryLineEntry(BaseModel):
    text: str
    font_name: str = ""
    font_size_mm: float = 0.0


class HistoryEntryCreate(BaseModel):
    export_type: Literal["svg", "png"]
    filename: str
    full_text: str
    lines: list[HistoryLineEntry] = Field(default_factory=list)


class HistoryEntry(HistoryEntryCreate):
    timestamp: str


# --- Keychain ---
class KeychainModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class KeychainGlyphTransform(KeychainModel):
    glyph_index: int = Field(ge=0)
    dx_mm: float = Field(default=0, ge=-50, le=50)
    dy_mm: float = Field(default=0, ge=-50, le=50)
    scale: float = Field(default=1, ge=.5, le=2)
    rotation_deg: float = Field(default=0, ge=-45, le=45)


class KeychainSizeConfig(KeychainModel):
    mode: Literal["width", "height"] = "width"
    target_mm: float = Field(default=60, ge=10, le=200)

    @model_validator(mode="after")
    def check_axis_range(self):
        low, high = (25, 200) if self.mode == "width" else (10, 100)
        if not low <= self.target_mm <= high:
            raise ValueError(f"{self.mode.title()} must be between {low} and {high} mm.")
        return self


class KeychainBackingConfig(KeychainModel):
    offset_mm: float = Field(default=3, ge=1, le=10)
    fill_counters: bool = True
    smoothing_mm: float = Field(default=.5, ge=0, le=3)


class KeychainRingConfig(KeychainModel):
    enabled: bool = True
    position: Literal["top-left", "top-center", "top-right", "left-middle", "right-middle", "custom"] = "top-left"
    outer_diameter_mm: float = Field(default=12, ge=10, le=15)
    hole_diameter_mm: float = Field(default=5, ge=4, le=6)
    x_offset_mm: float = Field(default=0, ge=-100, le=100)
    y_offset_mm: float = Field(default=0, ge=-100, le=100)
    auto_snap: bool = True
    min_wall_thickness_mm: float = Field(default=3, gt=0, le=7.5)
    min_neck_width_mm: float = Field(default=5, gt=0, le=15)


class KeychainDotConfig(KeychainModel):
    auto_join: bool = True
    overlap_pct: float = Field(default=25, ge=10, le=50)
    manual_offsets: list[FloatingComponentOffset] = Field(default_factory=list)

    @field_validator("manual_offsets")
    @classmethod
    def finite_offsets(cls, offsets):
        import math
        if any(not math.isfinite(value) or abs(value) > 50 for offset in offsets
               for value in (offset.x_offset_mm, offset.y_offset_mm)):
            raise ValueError("Dot offsets must be finite and within 50 mm.")
        return offsets


class KeychainLayerColors(KeychainModel):
    backing: str = Field(default="#000000", pattern=HEX_COLOR_PATTERN)
    text: str = Field(default="#FF0000", pattern=HEX_COLOR_PATTERN)


class KeychainRequest(KeychainModel):
    text: str = Field(min_length=1, max_length=40)
    font_id: str = Field(min_length=1)
    style: Literal["engraved", "layered"] = "engraved"
    material_id: str = "cast-acrylic-3mm"
    size: KeychainSizeConfig = Field(default_factory=KeychainSizeConfig)
    overlap_mode: Literal["auto", "light", "medium", "strong", "custom"] = "auto"
    overlap_custom_mm: float | None = Field(default=None, gt=0, le=10)
    gap_configs: list[OverlapGapConfig] = Field(default_factory=list)
    letter_spacing_mm: float = Field(default=0, ge=-10, le=20)
    glyph_transforms: list[KeychainGlyphTransform] = Field(default_factory=list)
    dots: KeychainDotConfig = Field(default_factory=KeychainDotConfig)
    stroke_buffer_mm: float = Field(default=0, ge=0, le=.6)
    backing: KeychainBackingConfig = Field(default_factory=KeychainBackingConfig)
    ring: KeychainRingConfig = Field(default_factory=KeychainRingConfig)
    colors: KeychainLayerColors = Field(default_factory=KeychainLayerColors)
    layered_export: Literal["combined", "separate"] = "combined"
    quality: Literal["preview", "export"] = "preview"
    request_id: int | None = None

    @field_validator("text")
    @classmethod
    def single_line(cls, value):
        from .unicode_normalisation import normalise_text
        if any(char in value for char in "\r\n\u2028\u2029"):
            raise ValueError("Keychain names must be a single line.")
        if any(not (ord(char) == 9 or 0x20 <= ord(char) <= 0xD7FF
                    or 0xE000 <= ord(char) <= 0xFFFD or 0x10000 <= ord(char) <= 0x10FFFF) for char in value):
            raise ValueError("Keychain names contain an unsupported control character.")
        return normalise_text(value)

    @model_validator(mode="after")
    def valid_settings(self):
        from .material_profiles import get_material
        get_material(self.material_id)
        if self.overlap_mode == "custom" and self.overlap_custom_mm is None:
            raise ValueError("Custom overlap requires overlap_custom_mm.")
        for indices in ([item.glyph_index for item in self.glyph_transforms],
                        [item.glyph_index for item in self.dots.manual_offsets],
                        [item.pair_index for item in self.gap_configs]):
            if len(set(indices)) != len(indices):
                raise ValueError("Duplicate glyph or gap settings are not allowed.")
        return self


class KeychainGlyphInfo(KeychainModel):
    glyph_index: int
    cluster_text: str
    bbox_mm: tuple[float, float, float, float]
    has_floating_component: bool


class KeychainCheck(KeychainModel):
    id: str
    severity: Literal["error", "warning", "info", "pass"]
    message: str
    fix: dict | None = None
    highlight_bbox_mm: tuple[float, float, float, float] | None = None
    # Plain-language reason when a failing check has no automatic fix, or what
    # the fix cannot guarantee. Additive field; older clients ignore it.
    fix_note: str | None = None


class KeychainRingMetadata(KeychainModel):
    center_x_mm: float
    center_y_mm: float
    outer_diameter_mm: float
    hole_diameter_mm: float
    wall_thickness_mm: float
    neck_width_mm: float
    snapped: bool
    touching: bool
    hole_clearance_mm: float
    # Pre-snap centre (position preset + offsets) in the same fitted canvas
    # coordinates. Clients rebase drags from the actual snapped centre.
    requested_center_x_mm: float | None = None
    requested_center_y_mm: float | None = None


class KeychainFile(KeychainModel):
    filename: str
    svg: str


class KeychainResponse(KeychainModel):
    request_id: int | None = None
    preview_svg: str
    files: list[KeychainFile] = Field(default_factory=list)
    png_base64: str | None = None
    width_mm: float
    height_mm: float
    canvas_width_mm: float
    canvas_height_mm: float
    scale_applied: float
    size_solve_converged: bool
    glyphs: list[KeychainGlyphInfo]
    ring: KeychainRingMetadata | None
    checks: list[KeychainCheck]
    recipe: dict
    timings_ms: dict[str, float]
    # R1 (additive): an export is returned even when its history entry could
    # not be saved; the client tells the user the file still downloaded.
    history_saved: bool = True
    warnings: list[str] = Field(default_factory=list)


class KeychainHistoryCreate(KeychainModel):
    recipe: dict
    filename: str = Field(min_length=1, max_length=255)
    width_mm: float = Field(gt=0)
    height_mm: float = Field(gt=0)

    @field_validator("recipe")
    @classmethod
    def valid_recipe(cls, value):
        # Preserve version metadata while validating and normalising the request.
        return {**KeychainRequest.model_validate(value).model_dump(), "app_version": "keychain-1"}


class KeychainHistoryEntry(KeychainHistoryCreate):
    timestamp: str

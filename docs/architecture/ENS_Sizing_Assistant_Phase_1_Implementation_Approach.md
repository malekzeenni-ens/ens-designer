# ENS Designer — Sizing Assistant Phase 1  
## Implementation Approach for Coding Agent

Based on the attached PSD/FSD, Phase 1 should be implemented as a **configurable, rule-based production sizing assistant**, not as a CAD validator or laser-safety geometry analyser. The core scope is: upload final design, detect dimensions, calculate aspect ratio, recommend physical size in mm, show warnings, advise stake depth/count, allow proportional manual override, and export a resized SVG.

---

# 1. Executive Technical Summary

Build a new **Sizing Assistant** tab inside ENS Designer.

The feature must allow the operator to:

1. Upload a final SVG or PNG.
2. Detect original design dimensions.
3. Calculate aspect ratio.
4. Categorise the design as very tall, tall, balanced, wide, or very wide.
5. Select product type and cake size.
6. Generate a recommended physical visible size in millimetres.
7. Preserve aspect ratio at all times.
8. Show warning/status messages.
9. Recommend stake depth and single/double stake where applicable.
10. Allow manual width/height override while keeping aspect ratio locked.
11. Export a resized SVG for production.

The most important rule:

```text
The design must never be stretched.
Aspect ratio must always remain locked.
```

Phase 1 must **not** include:

```text
Automatic laser safety geometry analysis
Automatic weld validation
Stroke width detection
Bridge width detection
Disconnected island detection
Fragile detail detection
AI redesign
Shopify/customer-facing integration
```

---

# 2. Current Codebase Discovery Plan

Before coding, inspect the existing ENS Designer codebase.

The coding agent should first identify:

```text
- Existing tab/routing structure
- Current design canvas architecture
- Existing SVG parsing logic
- Existing SVG preview/rendering logic
- Existing PNG preview support, if any
- Existing export/download utilities
- Existing stake-generation logic
- Existing app state management
- Existing shared types/models
- Existing test framework
- Existing styling/component conventions
```

Start by inspecting likely folders such as:

```text
src/
src/components/
src/features/
src/pages/
src/tabs/
src/canvas/
src/export/
src/utils/
src/types/
src/lib/
src/state/
src/store/
src/hooks/
backend/
```

The agent must not assume the project structure. It should inspect first, then adapt the implementation plan to the real codebase.

---

# 3. Recommended Architecture

Implement the feature with strict separation of concerns.

Recommended structure, adapting names to the actual codebase:

```text
src/
  features/
    sizing-assistant/
      components/
        SizingAssistantTab.tsx
        SizingInputPanel.tsx
        UploadDesignControl.tsx
        SizingPreviewPanel.tsx
        SizingRecommendationCard.tsx
        ManualOverrideControls.tsx
        WarningList.tsx

      engine/
        sizingTypes.ts
        sizingRules.ts
        parseDesignDimensions.ts
        calculateAspectRatioCategory.ts
        calculateSizingRecommendation.ts
        calculateStakeRecommendation.ts
        buildSizingWarnings.ts
        calculateSizingStatus.ts
        exportResizedSvg.ts
        filenameUtils.ts

      tests/
        parseDesignDimensions.test.ts
        calculateAspectRatioCategory.test.ts
        calculateSizingRecommendation.test.ts
        calculateStakeRecommendation.test.ts
        buildSizingWarnings.test.ts
        calculateSizingStatus.test.ts
        exportResizedSvg.test.ts
```

Main architectural rules:

```text
- UI components must not contain sizing business rules.
- sizingRules.ts must hold configurable business rules.
- Calculation engine must be pure and testable.
- Warning engine must be separate from status calculation.
- SVG export must be isolated from UI.
- Existing ENS Designer behaviour must not be changed unless required for this tab.
```

---

# 4. Data Model Design

Create implementation-ready TypeScript types.

```ts
export type UploadedDesignType = 'svg' | 'png';

export type ProductType =
  | 'topCakeTopper'
  | 'sideCakeCharm'
  | 'cupcakeCharm'
  | 'logoCakeCharm'
  | 'numberTopper'
  | 'monogramTopper';

export type CakeSize = '4' | '6' | '8' | '10';

export type MaterialType =
  | '3mmAcrylic'
  | 'mirrorAcrylic'
  | 'layeredAcrylic'
  | '3mmPlywood'
  | 'other';

export type DesignUse =
  | 'heroTopper'
  | 'subtleCharm'
  | 'logoBranding'
  | 'cupcakeDecoration'
  | 'weddingMonogram'
  | 'numberFeature';

export type FontCategory =
  | 'unknown'
  | 'script'
  | 'serif'
  | 'sansSerif'
  | 'chunky'
  | 'thin'
  | 'handwritten'
  | 'decorative';

export type StakeOption = 'auto' | 'none' | 'single' | 'double';

export type AspectCategory =
  | 'veryTall'
  | 'tall'
  | 'balanced'
  | 'wide'
  | 'veryWide';

export type SizingStatus =
  | 'goodToCut'
  | 'needsReview'
  | 'tooWide'
  | 'tooTall'
  | 'tooSmall'
  | 'notRecommended';

export type WarningSeverity = 'info' | 'warning' | 'critical';

export type StakeRecommendation = 'none' | 'single' | 'double';

export type UploadedDesignMetadata = {
  name: string;
  type: UploadedDesignType;
  originalWidth: number | null;
  originalHeight: number | null;
  originalUnit: 'px' | 'mm' | 'unitless' | 'unknown';
  viewBox?: string;
  dpi?: number;
  rawSvgText?: string;
  previewUrl?: string;
  dimensionsDetected: boolean;
};

export type SizingProductConfig = {
  productType: ProductType;
  cakeSize: CakeSize;
  material: MaterialType;
  designUse: DesignUse;
  numberOfLines?: number;
  fontCategory: FontCategory;
  stakeOption: StakeOption;
  maxAllowedWidthMm?: number;
  maxAllowedHeightMm?: number;
  customerRequestedWidthMm?: number;
};

export type ManualOverrideState = {
  enabled: boolean;
  widthMm?: number;
  heightMm?: number;
  lastEditedDimension?: 'width' | 'height';
};

export type SizingWarning = {
  code: string;
  severity: WarningSeverity;
  message: string;
  suggestedAction?: string;
};

export type SizingRecommendation = {
  cakeDiameterMm: number;
  aspectRatio: number;
  aspectCategory: AspectCategory;
  recommendedWidthMm: number;
  recommendedHeightMm: number;
  acceptableMinWidthMm: number;
  acceptableMaxWidthMm: number;
  visibleHeightMm: number;
  stakeDepthMm?: number;
  totalCutHeightMm?: number;
  stakeRecommendation: StakeRecommendation;
  scaleFactor: number;
  status: SizingStatus;
  warnings: SizingWarning[];
  notes: string[];
  isManualOverride: boolean;
  exportAvailable: boolean;
};

export type SizingAssistantState = {
  uploadedFile: UploadedDesignMetadata | null;
  productConfig: SizingProductConfig;
  manualOverride: ManualOverrideState;
  recommendation: SizingRecommendation | null;
};
```

---

# 5. Configurable Rules File

Create:

```text
sizingRules.ts
```

This must be the single source of truth for sizing rules.

```ts
export const cakeSizes = {
  '4': { label: '4 inch', diameterMm: 101.6 },
  '6': { label: '6 inch', diameterMm: 152.4 },
  '8': { label: '8 inch', diameterMm: 203.2 },
  '10': { label: '10 inch', diameterMm: 254 },
} as const;

export const aspectRatioCategories = {
  veryTall: { maxExclusive: 0.5 },
  tall: { minInclusive: 0.5, maxExclusive: 0.8 },
  balanced: { minInclusive: 0.8, maxInclusive: 1.4 },
  wide: { minExclusive: 1.4, maxInclusive: 2.2 },
  veryWide: { minExclusive: 2.2 },
} as const;

export const topperSizingRules = {
  topCakeTopper: {
    '4': { minWidth: 70, preferredWidth: 78, maxWidth: 85, maxVisibleHeight: 90 },
    '6': { minWidth: 105, preferredWidth: 120, maxWidth: 130, maxVisibleHeight: 120 },
    '8': { minWidth: 135, preferredWidth: 150, maxWidth: 165, maxVisibleHeight: 145 },
    '10': { minWidth: 165, preferredWidth: 180, maxWidth: 200, maxVisibleHeight: 175 },
  },
  numberTopper: {
    '4': { minWidth: 70, preferredWidth: 80, maxWidth: 85, maxVisibleHeight: 95 },
    '6': { minWidth: 110, preferredWidth: 125, maxWidth: 140, maxVisibleHeight: 130 },
    '8': { minWidth: 140, preferredWidth: 155, maxWidth: 175, maxVisibleHeight: 160 },
    '10': { minWidth: 170, preferredWidth: 190, maxWidth: 210, maxVisibleHeight: 190 },
  },
  monogramTopper: {
    '4': { minWidth: 70, preferredWidth: 78, maxWidth: 85, maxVisibleHeight: 90 },
    '6': { minWidth: 110, preferredWidth: 120, maxWidth: 130, maxVisibleHeight: 120 },
    '8': { minWidth: 140, preferredWidth: 150, maxWidth: 165, maxVisibleHeight: 145 },
    '10': { minWidth: 165, preferredWidth: 180, maxWidth: 200, maxVisibleHeight: 175 },
  },
} as const;

export const charmSizingRules = {
  sideCakeCharm: {
    defaultWidth: 40,
    minWidth: 25,
    maxWidth: 60,
  },
  cupcakeCharm: {
    defaultWidth: 30,
    minWidth: 20,
    maxWidth: 40,
  },
  logoCakeCharm: {
    defaultWidth: 35,
    minWidth: 30,
    maxWidth: 60,
  },
} as const;

export const stakeRules = {
  depths: {
    '4': { min: 35, preferred: 40, max: 45 },
    '6': { min: 40, preferred: 45, max: 50 },
    '8': { min: 45, preferred: 50, max: 60 },
    '10': { min: 50, preferred: 60, max: 65 },
  },
  doubleStakeWidthThresholdMm: 120,
  heavyMaterials: ['mirrorAcrylic', 'layeredAcrylic'],
} as const;

export const warningThresholds = {
  cupcakeMaxRecommendedWidthMm: 40,
  logoMinReadableWidthMm: 30,
  manualOverrideTolerancePercent: 10,
  verySmallHeightMm: 20,
  verySmallWidthMm: 20,
} as const;
```

---

# 6. Dimension Parsing Approach

Create:

```text
parseDesignDimensions.ts
```

## SVG Parsing

Order of priority:

```text
1. Read viewBox
2. If no viewBox, read width and height
3. Parse units where possible
4. If still unknown, request manual dimensions
```

Implementation behaviour:

```ts
type ParsedDesignDimensions = {
  width: number | null;
  height: number | null;
  unit: 'px' | 'mm' | 'unitless' | 'unknown';
  viewBox?: string;
  dimensionsDetected: boolean;
  errors: string[];
};
```

SVG logic:

```text
- If viewBox exists: use viewBox width/height.
- If width/height exists in mm: use as mm.
- If width/height exists in px: use values as proportional dimensions for aspect ratio.
- If width/height is percentage-based: treat as unknown unless viewBox exists.
- If dimensions are zero, negative, NaN, or missing: request manual dimensions.
```

## PNG Parsing

PNG should be preview/reference only.

Behaviour:

```text
- Read naturalWidth and naturalHeight.
- Use these for aspect ratio.
- Mark originalUnit as px.
- Show PNG warning.
- Disable resized SVG export.
```

---

# 7. Sizing Calculation Engine

Create:

```text
calculateSizingRecommendation.ts
```

This should be a pure function.

```ts
export function calculateSizingRecommendation(input: {
  uploadedFile: UploadedDesignMetadata;
  productConfig: SizingProductConfig;
  manualOverride: ManualOverrideState;
}): SizingRecommendation;
```

Core calculation flow:

```text
1. Validate uploaded dimensions.
2. Validate product type and cake size.
3. Get cake diameter.
4. Calculate aspect ratio.
5. Categorise aspect ratio.
6. Load product-specific sizing rule.
7. Determine preferred width.
8. Calculate height from locked aspect ratio.
9. Apply height limit, if applicable.
10. Check min/max width.
11. Apply manual override, if enabled.
12. Recalculate width/height proportionally.
13. Calculate scale factor.
14. Calculate stake recommendation, if applicable.
15. Calculate warnings.
16. Calculate status.
17. Return recommendation.
```

Non-negotiable invariant:

```ts
height = width / aspectRatio;
width = height * aspectRatio;
```

Never do this:

```ts
width = targetWidth;
height = targetHeight;
```

unless the two values are mathematically proportional.

---

# 8. Aspect Ratio Logic

Create:

```text
calculateAspectRatioCategory.ts
```

```ts
export function calculateAspectRatioCategory(aspectRatio: number): AspectCategory {
  if (aspectRatio < 0.5) return 'veryTall';
  if (aspectRatio >= 0.5 && aspectRatio < 0.8) return 'tall';
  if (aspectRatio >= 0.8 && aspectRatio <= 1.4) return 'balanced';
  if (aspectRatio > 1.4 && aspectRatio <= 2.2) return 'wide';
  return 'veryWide';
}
```

Behaviour by category:

```text
Balanced:
- Use preferred width.
- Usually Good to cut unless other warnings apply.

Wide:
- Use preferred width, but warn that height may become visually small.

Very wide:
- Consider conservative width.
- Warn that design may need stacking.
- Do not stretch vertically.

Tall:
- Check height limit carefully.
- Warn about visual height.

Very tall:
- Use height limit first.
- Warn that layout may overpower cake.
- Do not squash vertically.
```

---

# 9. Product-Specific Sizing Logic

## Top Cake Topper

Use `topperSizingRules.topCakeTopper`.

```text
4 inch: 70–85mm, preferred 78mm
6 inch: 105–130mm, preferred 120mm
8 inch: 135–165mm, preferred 150mm
10 inch: 165–200mm, preferred 180mm
```

## Side Cake Charm

Use:

```text
Default width: 40mm
Range: 25–60mm
```

## Cupcake Charm

Use:

```text
Default width: 30mm
Range: 20–40mm
```

Warn if width exceeds 40mm.

## Logo Cake Charm

Use:

```text
Default width: 35mm
Range: 30–60mm
```

Add warning if:

```text
- Width is below 30mm
- Aspect ratio is very wide
- User selected complex/decorative/thin font category
```

## Number Topper

Use slightly larger width ranges than standard text toppers.

## Monogram Topper

Use topper-like sizing.

Always add manual-review warning where relevant:

```text
- Thin initials
- Ampersands
- Internal counters
- Disconnected letters
- Fragile joins
```

But do **not** inspect geometry automatically in Phase 1.

---

# 10. Height Limit Logic

Height rule:

```ts
recommendedHeight = recommendedWidth / aspectRatio;
```

If the design exceeds max visible height:

```ts
adjustedHeight = maxVisibleHeight;
adjustedWidth = adjustedHeight * aspectRatio;
```

Then check:

```ts
if (adjustedWidth < minWidth) {
  // warning: design only fits if reduced significantly
}
```

Warning example:

```text
This design only fits if reduced significantly. Consider changing the layout rather than cutting it at this size.
```

---

# 11. Stake Recommendation Logic

Create:

```text
calculateStakeRecommendation.ts
```

Stake applies only to:

```text
topCakeTopper
numberTopper
monogramTopper
```

Stake does not apply to:

```text
sideCakeCharm
cupcakeCharm
logoCakeCharm
```

Function shape:

```ts
export function calculateStakeRecommendation(input: {
  productType: ProductType;
  cakeSize: CakeSize;
  material: MaterialType;
  designUse: DesignUse;
  visibleWidthMm: number;
  visibleHeightMm: number;
  stakeOption: StakeOption;
}): {
  stakeDepthMm?: number;
  stakeRecommendation: StakeRecommendation;
  totalCutHeightMm?: number;
  warnings: SizingWarning[];
};
```

Rules:

```text
- Use cake-size preferred stake depth.
- If product does not use stakes, return none.
- If user selected No stake, return none but warn if this is a topper.
- If user selected Single stake, return single but warn if width/material suggests double.
- If user selected Double stake, return double.
- If Auto:
  - Recommend double if width > 120mm.
  - Recommend double if material is mirror acrylic.
  - Recommend double if material is layered acrylic.
  - Recommend double if design use is hero topper.
  - Otherwise recommend single.
```

Total cut height:

```ts
totalCutHeightMm = visibleHeightMm + stakeDepthMm;
```

---

# 12. Warning Engine

Create:

```text
buildSizingWarnings.ts
```

Warnings should be structured:

```ts
export type SizingWarning = {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction?: string;
};
```

Required warning codes:

```text
VERY_WIDE_DESIGN
WIDE_DESIGN
VERY_TALL_DESIGN
TALL_DESIGN
HEIGHT_EXCEEDS_GUIDANCE
WIDTH_BELOW_RECOMMENDED_RANGE
WIDTH_ABOVE_RECOMMENDED_RANGE
CUPCAKE_CHARM_TOO_LARGE
LOGO_MAY_BE_UNREADABLE
THIN_FONT_MANUAL_CHECK
PNG_PREVIEW_ONLY
MANUAL_OVERRIDE_OUTSIDE_RANGE
MIRROR_OR_LAYERED_ACRYLIC_CAUTION
DOUBLE_STAKE_RECOMMENDED
SVG_DIMENSIONS_MISSING
EXPORT_UNAVAILABLE_FOR_PNG
```

Example:

```ts
{
  code: 'VERY_WIDE_DESIGN',
  severity: 'warning',
  message:
    'This design is very wide. It may look too small when scaled to fit the selected cake size.',
  suggestedAction:
    'Consider stacking the words into two or three lines instead of stretching the design.',
}
```

---

# 13. Status Calculation

Create:

```text
calculateSizingStatus.ts
```

Status precedence should be deterministic.

Recommended precedence:

```text
1. Not recommended
2. Too wide
3. Too tall
4. Too small
5. Needs review
6. Good to cut
```

Logic:

```text
Not recommended:
- Missing dimensions
- Invalid dimensions
- SVG dimensions cannot be detected and no manual dimensions entered
- PNG uploaded and user attempts production export

Too wide:
- Aspect ratio very wide and final height becomes impractically small
- Width exceeds product max or user-defined max significantly

Too tall:
- Aspect ratio very tall and height limit makes width too small
- Height exceeds max guidance significantly

Too small:
- Recommended size below minimum practical visual size
- Logo/text likely unreadable

Needs review:
- PNG uploaded
- Manual override active
- Thin/script/decorative font selected
- Mirror/layered material caution
- Wide/tall but still possible

Good to cut:
- No significant warnings
- Dimensions valid
- Recommendation within range
```

---

# 14. Manual Override Behaviour

Manual override must preserve aspect ratio.

When user changes width:

```ts
height = width / aspectRatio;
```

When user changes height:

```ts
width = height * aspectRatio;
```

Manual override should trigger:

```text
- Live recommendation recalculation
- Warning recalculation
- Stake recalculation
- Preview update
- Export dimension update
```

If override is outside acceptable range, show:

```text
This size is outside the recommended range. Proceed only if you have checked the design manually.
```

Do not allow independent unlock of width/height in Phase 1.

---

# 15. Preview Implementation Approach

Build the centre preview panel as a lightweight visual guide.

Required preview elements:

```text
- Uploaded design preview
- Cake footprint circle
- Selected cake diameter label
- Recommended visible width label
- Recommended visible height label
- Aspect ratio locked indicator
- Status badge
```

Recommended approach:

```text
- Use SVG/HTML overlay for the cake circle and measurement labels.
- Render uploaded SVG directly where safe.
- Render PNG as an image preview.
- Scale visual display proportionally based on calculated recommendation.
- Do not attempt laser safety geometry simulation.
```

Phase 1 only needs:

```text
Top view
```

Do not build side-view, cut-file-view, 3D simulation, or CAD visualisation unless already trivial.

---

# 16. SVG Export Approach

Create:

```text
exportResizedSvg.ts
```

SVG export requirements:

```text
- SVG upload only
- Preserve original vector content
- Preserve viewBox
- Set width in mm
- Set height in mm
- Do not stretch
- Do not modify paths unnecessarily
- Do not export PNG as SVG
```

Recommended initial implementation:

```text
If original SVG has viewBox:
- Preserve the original viewBox.
- Set root width="[finalWidth]mm".
- Set root height="[finalHeight]mm".
```

If original SVG has no viewBox but valid width/height:

```text
- Consider generating a viewBox from original dimensions.
- Set root width/height in mm.
- Preserve internal content.
```

Avoid wrapping unless testing proves it imports more reliably into LightBurn.

Export filename:

```ts
ens-sized-[product-type]-[cake-size]-[width]x[height]mm.svg
```

Example:

```text
ens-sized-top-cake-topper-6inch-120x89mm.svg
```

Manual validation required:

```text
- Open exported SVG in LightBurn.
- Confirm physical dimensions are correct.
- Confirm aspect ratio is preserved.
- Confirm paths remain editable/cuttable.
```

---

# 17. UI Implementation Plan

## Left Panel — Inputs

Fields:

```text
- Upload design
- Product type
- Cake size
- Material
- Design use
- Number of text lines
- Font category
- Stake option
- Maximum allowed width
- Maximum allowed height
- Customer requested size
- Override recommendation toggle
```

Hide or disable stake controls for:

```text
sideCakeCharm
cupcakeCharm
logoCakeCharm
```

## Centre Panel — Preview

Show:

```text
- Cake footprint
- Uploaded design
- Recommended size overlay
- Width/height labels
- Aspect ratio locked indicator
```

## Right Panel — Recommendation Card

Show:

```text
- Status
- Product type
- Cake size
- Cake diameter
- Aspect ratio
- Aspect category
- Recommended visible width
- Recommended visible height
- Acceptable width range
- Stake depth
- Total cut height
- Stake recommendation
- Scale factor
- Warnings
- Suggested actions
- Export resized SVG button
```

Export button should be disabled when:

```text
- Uploaded file is PNG
- Dimensions are missing
- Upload is invalid
- No recommendation exists
```

---

# 18. Step-by-Step Implementation Phases

## Phase 1A — Foundation

```text
- Add Sizing Assistant tab.
- Add basic route/tab registration.
- Add upload component.
- Add left input panel.
- Add centre preview placeholder.
- Add right recommendation card placeholder.
- Confirm no existing tabs are broken.
```

## Phase 1B — Rules and Calculation Engine

```text
- Add sizingTypes.ts.
- Add sizingRules.ts.
- Add parseDesignDimensions.ts.
- Add calculateAspectRatioCategory.ts.
- Add calculateSizingRecommendation.ts.
- Implement cake size conversion.
- Implement preferred width selection.
- Implement height-limit logic.
```

## Phase 1C — Warning and Status Engine

```text
- Add buildSizingWarnings.ts.
- Add calculateSizingStatus.ts.
- Add warnings for aspect ratio, PNG, thin fonts, manual override, and product limits.
- Ensure warnings are structured.
- Ensure status is deterministic.
```

## Phase 1D — Stake Guidance

```text
- Add calculateStakeRecommendation.ts.
- Implement stake depth by cake size.
- Implement single/double stake logic.
- Calculate total cut height.
- Hide stake UI for non-topper product types.
```

## Phase 1E — Preview and Manual Override

```text
- Build proportional cake footprint preview.
- Render uploaded design preview.
- Add manual width/height override.
- Keep aspect ratio locked.
- Recalculate live after override.
```

## Phase 1F — SVG Export

```text
- Add exportResizedSvg.ts.
- Preserve SVG content.
- Set width/height in mm.
- Generate correct filename.
- Disable export for PNG.
- Validate exported SVG manually in LightBurn/current workflow.
```

## Phase 1G — QA and Hardening

```text
- Add unit tests.
- Add edge-case tests.
- Test common production scenarios.
- Test bad SVGs.
- Test missing dimensions.
- Test PNG preview.
- Test manual override.
- Test exported SVG import.
- Confirm no regression in existing ENS Designer features.
```

---

# 19. Testing Strategy

## Unit Tests

Add tests for:

```text
- Cake size conversion
- Aspect ratio calculation
- Aspect ratio category boundaries
- Product-specific preferred width
- Height-limit adjustment
- Width below minimum detection
- Width above maximum detection
- Stake depth recommendation
- Single vs double stake logic
- Warning generation
- Status precedence
- Manual override width-to-height calculation
- Manual override height-to-width calculation
- SVG viewBox parsing
- SVG width/height fallback parsing
- PNG dimension reading
- SVG export width/height in mm
```

## Boundary Tests

Aspect ratio tests:

```text
0.49 = veryTall
0.5 = tall
0.79 = tall
0.8 = balanced
1.4 = balanced
1.41 = wide
2.2 = wide
2.21 = veryWide
```

## Manual QA Designs

Test with:

```text
- One-line “Happy Birthday Sarah”
- Three-line “Happy Birthday Sarah”
- Four-line “Happy 40th Birthday Heaven”
- Single number topper
- Two-digit number topper
- Wide logo charm
- Round logo charm
- Small cupcake icon
- Monogram AK
- Thin script name
- Chunky sans name
- SVG with clean viewBox
- SVG with no viewBox
- PNG upload
- Manual override too large
- Manual override too small
- Mirror acrylic topper over 120mm
- Cupcake charm above 40mm
```

---

# 20. Edge Cases and Error Handling

Handle:

```text
Unsupported file type
SVG without viewBox
SVG without width/height
SVG with percentage dimensions
SVG with px dimensions
SVG with mm dimensions
SVG with invalid dimensions
Zero width or height
Very wide aspect ratio
Very tall aspect ratio
PNG upload
Manual override invalid value
Export requested without SVG
Product type selected before upload
Upload changed after override
Cake size changed after override
Stake setting changed after recommendation
```

Required messages:

```text
Unsupported file type. Please upload an SVG or PNG file.

The SVG dimensions could not be detected. Please enter the original design width and height manually.

Please enter valid width and height values greater than 0.

SVG export is only available for SVG uploads. Please upload the final vector SVG for production export.

A recommendation cannot be generated until a design, product type, and cake size are selected.
```

---

# 21. Acceptance Criteria Mapping

## AC-001 — Tab Exists

Implementation:

```text
SizingAssistantTab registered in existing tab/navigation system.
```

Test:

```text
Render app and assert Sizing Assistant tab exists.
```

## AC-002 — Upload SVG

Implementation:

```text
UploadDesignControl + parseDesignDimensions.
```

Test:

```text
Upload valid SVG and assert dimensions + preview exist.
```

## AC-003 — Upload PNG

Implementation:

```text
PNG branch in upload parser.
```

Test:

```text
Upload PNG and assert preview appears with PNG warning.
```

## AC-004 — Select Cake Size

Implementation:

```text
cakeSizes config.
```

Test:

```text
Select 6 inch and assert 152.4mm displayed.
```

## AC-005 — Select Product Type

Implementation:

```text
Product type drives rule selection.
```

Test:

```text
Select Top cake topper and assert topCakeTopper rules are used.
```

## AC-006 — Aspect Ratio Calculation

Implementation:

```text
calculateAspectRatioCategory.
```

Test:

```text
Given width/height, assert ratio and category.
```

## AC-007 — Recommended Size

Implementation:

```text
calculateSizingRecommendation.
```

Test:

```text
Valid SVG + product + cake size returns width/height in mm.
```

## AC-008 — Aspect Ratio Lock

Implementation:

```text
ManualOverrideControls.
```

Test:

```text
Change width and assert height updates proportionally.
```

## AC-009 — Very Wide Warning

Implementation:

```text
buildSizingWarnings.
```

Test:

```text
Aspect ratio > 2.2 returns VERY_WIDE_DESIGN warning.
```

## AC-010 — Very Tall Warning

Implementation:

```text
buildSizingWarnings.
```

Test:

```text
Aspect ratio < 0.5 returns VERY_TALL_DESIGN warning.
```

## AC-011 — Stake Recommendation

Implementation:

```text
calculateStakeRecommendation.
```

Test:

```text
Top cake topper returns stake depth and total cut height.
```

## AC-012 — Double Stake Rule

Implementation:

```text
stakeRules.doubleStakeWidthThresholdMm.
```

Test:

```text
Visible width > 120mm returns double stake in auto mode.
```

## AC-013 — Export Resized SVG

Implementation:

```text
exportResizedSvg.
```

Test:

```text
Exported SVG has width/height in mm and preserved viewBox.
```

## AC-014 — Missing Dimensions

Implementation:

```text
parseDesignDimensions + manual dimension input.
```

Test:

```text
SVG without usable dimensions requires manual input and disables export.
```

---

# 22. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| SVG dimensions parsed incorrectly | Prefer viewBox, add fallback parsing, add unit tests with real SVGs |
| Exported SVG imports incorrectly into LightBurn | Manual LightBurn validation before marking done |
| Rules hardcoded in UI | Keep all rules in `sizingRules.ts` |
| Manual override creates risky sizes | Add override warning and status downgrade |
| PNG users assume production-safe export | Disable SVG export for PNG and show clear warning |
| Scope creep into laser geometry validation | Explicitly exclude geometry analysis from implementation |
| Existing ENS Designer features break | Isolate feature in new module/tab and regression test existing flows |
| Stake guidance confused with actual stake generation | Label as recommendation only unless existing stake generation is intentionally integrated |
| Complex SVGs render differently in preview/export | Avoid path modifications; preserve original vector content |

---

# 23. Definition of Done

Phase 1 is complete only when:

```text
- Sizing Assistant tab exists.
- SVG upload works.
- PNG upload works for preview only.
- SVG dimensions are detected from viewBox or width/height.
- Missing dimensions trigger manual dimension input.
- Product type and cake size selection work.
- Cake size is converted to mm.
- Aspect ratio is calculated.
- Aspect ratio category is displayed.
- Recommended physical width/height are calculated in mm.
- Height limit logic works.
- Aspect ratio remains locked at all times.
- Manual override works proportionally.
- Rule-based warnings are shown.
- Recommendation status is shown.
- Stake depth is shown for relevant product types.
- Single/double stake recommendation works.
- Total cut height is calculated where relevant.
- SVG export works for SVG uploads.
- PNG export is blocked.
- Exported SVG uses mm dimensions.
- Exported SVG has been manually tested in LightBurn/current workflow.
- Sizing rules are configurable outside the UI.
- Calculation engine has unit tests.
- Warning/status logic has unit tests.
- Existing ENS Designer features remain unaffected.
```

---

# 24. Coding Agent Execution Instructions

The coding agent should follow this sequence:

```text
1. Do not start coding immediately.
2. Inspect the current ENS Designer codebase.
3. Identify existing tab, upload, preview, export, and state patterns.
4. Report the exact files that will be changed or added.
5. Confirm whether existing SVG/export utilities can be reused.
6. Implement the feature in isolated modules.
7. Keep all sizing rules outside UI components.
8. Add pure calculation utilities.
9. Add unit tests before or alongside implementation.
10. Add the UI after the engine is stable.
11. Add SVG export last.
12. Validate exported SVG in the current laser workflow.
13. Do not add geometry validation or AI redesign in Phase 1.
14. Do not alter existing design-generation behaviour unless strictly required.
```

---

# 25. Final Recommended Build Order

The safest implementation order is:

```text
1. Types
2. Rules config
3. Dimension parser
4. Aspect ratio categoriser
5. Core sizing calculator
6. Warning engine
7. Status calculator
8. Stake calculator
9. Unit tests
10. Sizing Assistant tab shell
11. Upload + input panel
12. Recommendation card
13. Preview panel
14. Manual override controls
15. SVG export
16. Manual LightBurn validation
17. Regression testing
```

This approach keeps the feature clean, testable, and safe for the existing ENS Designer codebase.

---

# 26. Deployment, Commit, and Revert Snapshot Guide

This section defines how the coding agent must manage implementation snapshots, commits, deployment notes, and revert safety while building the Sizing Assistant Phase 1.

The goal is to ensure every meaningful code change has a traceable timestamped record, a clear implementation summary, and a safe rollback point.

---

## 26.1 Deployment and Commit Principle

The coding agent must work in small, controlled implementation increments.

After each completed phase or meaningful code change, the agent must:

```text
1. Run the relevant tests.
2. Confirm the app builds locally.
3. Update the deployment log with a timestamped entry.
4. Commit the changes.
5. Push/commit to main as instructed.
6. Record the commit hash in the deployment log.
7. Record what changed, what was tested, and how to revert.
```

Important instruction:

```text
The coding agent should commit/deploy to main after each successfully verified phase or code change, unless the repository workflow or branch protection rules prevent direct commits to main.
```

If direct commit to main is blocked by branch protection, the agent must:

```text
- Create the smallest possible pull request.
- Clearly label it with the phase name.
- Ensure the deployment log is updated before opening the PR.
- Merge to main once checks pass.
```

---

## 26.2 Required Deployment Log File

Create or update a dedicated deployment log file.

Recommended file:

```text
docs/deployment-log.md
```

If the project already has a deployment or changelog convention, follow the existing convention, but the log must still include the fields below.

---

## 26.3 Deployment Log Entry Format

Each phase or meaningful code change must add a new entry using this structure:

```md
## [YYYY-MM-DD HH:mm:ss TZ] — Phase / Change Title

### Commit
- Commit hash: `<commit-hash>`
- Branch: `main`
- Deployment target: `local / main / production / other`

### Summary
- Short summary of the change.

### Files Changed
- `path/to/file`
- `path/to/file`

### Implementation Details
- What was added.
- What was changed.
- What was intentionally not changed.

### Tests Run
- `npm test`
- `npm run build`
- Any specific test command used.

### Manual Validation
- What was manually checked.
- Screens or flows verified.
- SVG/LightBurn validation result, where applicable.

### Known Issues / Follow-Ups
- Any remaining issues.
- Any deferred items.

### Revert Instructions
- Revert command:
  ```bash
  git revert <commit-hash>
  ```
- Notes:
  - Mention any dependencies or related commits if reverting requires more than one commit.
```

---

## 26.4 Timestamp Requirement

Every deployment log entry must include a precise timestamp.

Use local project timezone unless the repo already standardises on UTC.

Recommended timestamp format:

```text
YYYY-MM-DD HH:mm:ss Europe/London
```

Example:

```text
2026-06-20 18:42:10 Europe/London
```

The coding agent must not use vague timestamps such as:

```text
today
now
latest
```

---

## 26.5 Commit Granularity

Each commit should represent one clean implementation unit.

Recommended commit boundaries:

```text
Commit 1 — Add sizing assistant types and rules config
Commit 2 — Add dimension parser and tests
Commit 3 — Add aspect ratio and sizing engine
Commit 4 — Add warning and status engine
Commit 5 — Add stake recommendation logic
Commit 6 — Add Sizing Assistant tab shell
Commit 7 — Add input panel and upload handling
Commit 8 — Add recommendation card
Commit 9 — Add preview panel
Commit 10 — Add manual override behaviour
Commit 11 — Add SVG export
Commit 12 — Add QA hardening and regression fixes
```

Do not create one large commit containing the entire feature unless there is no alternative.

---

## 26.6 Commit Message Format

Use clear commit messages.

Recommended format:

```text
feat(sizing-assistant): add sizing rules and types
feat(sizing-assistant): add SVG dimension parser
feat(sizing-assistant): add core sizing recommendation engine
feat(sizing-assistant): add warning and status logic
feat(sizing-assistant): add stake recommendation logic
feat(sizing-assistant): add tab shell and input panel
feat(sizing-assistant): add preview and recommendation card
feat(sizing-assistant): add manual override behaviour
feat(sizing-assistant): add resized SVG export
test(sizing-assistant): add edge case coverage
fix(sizing-assistant): correct height limit calculation
docs(sizing-assistant): update deployment log
```

---

## 26.7 Required Verification Before Commit to Main

Before each commit/deploy to main, the agent must run the relevant checks available in the repo.

Recommended checks:

```bash
npm test
npm run build
npm run lint
```

If the repo uses different commands, inspect `package.json` and use the actual commands.

If any command is unavailable, document this in the deployment log.

Example:

```text
npm run lint was not available in package.json.
```

Do not claim a test was run if it was not run.

---

## 26.8 Main Branch Deployment Rule

The coding agent must follow this rule:

```text
After each phase or meaningful verified code change, commit/deploy the completed change to main and update docs/deployment-log.md with the commit hash and timestamp.
```

If direct deployment to main fails or is blocked:

```text
- Stop and document the blocker.
- Do not continue stacking unrelated changes.
- Create a PR or follow the repo’s required workflow.
- Keep the deployment log updated with the attempted action and result.
```

---

## 26.9 Revert Snapshot Rule

Every deployment log entry must make it possible to revert to the previous known-good state.

For each commit, document:

```text
- Commit hash
- Previous commit hash, if available
- Revert command
- Whether the commit depends on previous commits
- Whether reverting requires follow-up manual cleanup
```

Example:

```md
### Revert Instructions
- To revert this change:
  ```bash
  git revert abc1234
  ```
- This commit depends on the sizing types added in commit def5678.
- If reverting this commit only, keep `sizingTypes.ts`.
```

---

## 26.10 Phase Completion Snapshot

At the end of each phase, add a phase completion entry.

Example:

```md
## [2026-06-20 18:55:00 Europe/London] — Phase 1B Complete: Rules and Calculation Engine

### Commit
- Commit hash: `abc1234`
- Branch: `main`

### Summary
- Added sizing rules, data types, dimension parser, aspect ratio categorisation, and core sizing calculation engine.

### Verification
- Unit tests passed.
- Build passed.
- Manual smoke test completed.

### Snapshot Status
- This is a known-good snapshot for Phase 1B.
- Revert to previous phase using:
  ```bash
  git revert abc1234
  ```
```

---

## 26.11 Deployment Log Must Be Updated Before Marking Work Complete

The coding agent must not mark any phase as complete unless:

```text
- Code is committed.
- Code is on main, or PR is ready if direct main commit is blocked.
- Deployment log has timestamp.
- Deployment log has commit hash.
- Tests/build status are documented.
- Revert instructions are documented.
```

---

## 26.12 Do Not Hide Failed Attempts

If a test fails, build fails, export fails, or LightBurn validation fails, document it.

Use this format:

```md
### Failed Validation
- Command / validation: `npm test`
- Result: Failed
- Reason: `<summary>`
- Action taken: `<fix or follow-up>`
```

Then add a follow-up entry once fixed.

---

## 26.13 Deployment Log Template

The coding agent should add this template to `docs/deployment-log.md` if the file does not already exist:

```md
# Deployment Log

This file records timestamped implementation snapshots for ENS Designer.

Each completed phase or meaningful code change must include:
- Timestamp
- Commit hash
- Branch
- Summary
- Files changed
- Tests run
- Manual validation
- Known issues
- Revert instructions

---

## [YYYY-MM-DD HH:mm:ss Europe/London] — Change Title

### Commit
- Commit hash: `<commit-hash>`
- Previous commit hash: `<previous-commit-hash>`
- Branch: `main`
- Deployment target: `main`

### Summary
- `<summary>`

### Files Changed
- `<file-path>`

### Implementation Details
- `<details>`

### Tests Run
- `<command>` — Passed / Failed / Not available

### Manual Validation
- `<manual validation notes>`

### Known Issues / Follow-Ups
- `<known issue or none>`

### Revert Instructions
```bash
git revert <commit-hash>
```

### Snapshot Status
- Known-good snapshot: Yes / No
```

---

## 26.14 Final Phase 1 Deployment Entry

When all Phase 1 work is complete, add a final deployment log entry:

```md
## [YYYY-MM-DD HH:mm:ss Europe/London] — Phase 1 Complete: Sizing Assistant MVP

### Commit
- Commit hash: `<final-commit-hash>`
- Branch: `main`
- Deployment target: `main`

### Summary
- Completed Sizing Assistant Phase 1 MVP.

### Completed Scope
- SVG upload
- PNG preview-only upload
- Dimension parsing
- Aspect ratio calculation
- Product/cake sizing rules
- Rule-based warnings
- Stake guidance
- Manual override with locked aspect ratio
- SVG export in mm
- Tests and QA hardening

### Tests Run
- `npm test`
- `npm run build`
- `npm run lint`, if available

### Manual Validation
- SVG upload tested.
- PNG preview tested.
- Manual override tested.
- Exported SVG opened in LightBurn/current workflow.
- Existing ENS Designer features smoke-tested.

### Known Issues / Follow-Ups
- `<list any remaining issues or write None>`

### Revert Instructions
```bash
git revert <final-commit-hash>
```

### Snapshot Status
- Known-good snapshot: Yes
- Phase 1 MVP complete: Yes
```

# ENS Designer — Sizing Assistant  
## Phase 1 Product Specification Document / Functional Specification Document

---

## 1. Document Purpose

This document defines the **Phase 1 scope** for a new feature in ENS Designer called **Sizing Assistant**.

The purpose of this feature is to help Etch ’n’ Shine correctly size final cake topper, cake charm, cupcake charm, logo charm, number topper, and monogram designs before laser cutting.

Phase 1 focuses on:

- Uploading a final design
- Reading design dimensions
- Calculating aspect ratio
- Selecting product type and cake size
- Recommending final physical size in millimetres
- Preserving aspect ratio
- Showing visual cake-fit guidance
- Giving rule-based warnings
- Recommending stake depth and single/double stake logic
- Exporting a resized SVG for production

Phase 1 does **not** include automatic deep SVG geometry safety analysis.

---

## 2. Product Background

Etch ’n’ Shine creates personalised laser-cut cake toppers and charms for cakes, cupcakes, bakeries, events, and gifting.

Current cake topper listings are typically based on customer-selected cake sizes such as:

- 4 inch cake
- 6 inch cake
- 8 inch cake
- 10 inch cake

The customer provides personalisation and often selects from predefined fonts or styles. The final design is then created either inside ENS Designer or externally.

The production challenge is deciding the **correct final physical cut size** for the generated design.

A 6 inch cake does not always mean the topper should be the same size. The final cut size depends on:

- Cake diameter
- Product type
- Number of lines
- Aspect ratio
- Font style
- Design density
- Whether it is a hero topper or subtle charm
- Whether it has stakes
- Whether it is wide, tall, or balanced
- Whether the result will look visually balanced on the cake

---

## 3. Business Objective

The Sizing Assistant should reduce manual judgement and improve production consistency by helping the maker answer:

```text
What physical size should I cut this final design at for the selected cake or product use?
```

The feature should help Etch ’n’ Shine:

- Reduce failed cuts
- Avoid oversized toppers
- Avoid tiny unreadable designs
- Avoid stretching or distorting artwork
- Improve visual consistency across orders
- Reduce time spent manually resizing designs
- Standardise sizing rules across Shopify/Etsy orders
- Support scalable production as order volume grows

---

## 4. Phase 1 Scope Summary

### In Scope

Phase 1 includes:

1. New **Sizing Assistant** tab.
2. Upload final SVG or PNG.
3. SVG preview.
4. PNG preview with warning.
5. Read SVG viewBox or width/height.
6. Read PNG pixel dimensions.
7. Select product type.
8. Select cake size.
9. Convert cake size from inches to millimetres.
10. Calculate design aspect ratio.
11. Categorise design shape:
   - Balanced
   - Wide
   - Very wide
   - Tall
   - Very tall
12. Recommend final visible width.
13. Recommend final visible height.
14. Apply height limit logic.
15. Preserve aspect ratio at all times.
16. Recommend stake depth for top cake toppers.
17. Recommend single or double stake.
18. Show design over cake footprint guide.
19. Show status and warnings.
20. Allow manual override.
21. Export resized SVG.
22. Store sizing rules in configurable rules file.

### Out of Scope

Phase 1 excludes:

- Automatic stroke width detection
- Automatic bridge/join width detection
- Automatic disconnected island detection
- Automatic internal counter detection
- Automatic SVG weld validation
- Automatic fragile detail detection
- Automatic text recognition
- Automatic font recognition
- AI layout suggestions
- AI redesign recommendations
- Batch sizing
- Shopify integration
- Customer-facing preview
- Saved listing presets
- Production PDF export, unless already simple from existing export logic

---

## 5. Feature Name

### Sizing Assistant

A new tab inside ENS Designer that acts as a production sizing guide for final cake topper and charm designs.

---

## 6. Primary User

The primary user is the Etch ’n’ Shine maker/operator.

The feature is intended for internal production use, not for end customers in Phase 1.

---

## 7. User Story

```text
As the Etch ’n’ Shine maker,
I want to upload a final SVG or PNG design and select the intended cake/product use,
so that I can receive a recommended physical cut size in millimetres,
while preserving aspect ratio and avoiding designs that are too large, too small, too wide, too tall, or visually unbalanced.
```

---

## 8. Core Product Principle

The Sizing Assistant must follow one non-negotiable rule:

```text
The design must never be stretched horizontally or vertically.
Aspect ratio must always remain locked.
```

The app may recommend a different size.  
The app may warn that the design should be redesigned.  
The app may suggest stacking or simplifying.

But it must never distort the design to force it into a target size.

---

## 9. Supported Product Types

Phase 1 must support the following product types.

### 9.1 Top Cake Topper

A topper inserted into the top of a cake using one or two stakes.

Examples:

- Happy Birthday Sarah
- Happy 40th Heaven
- One
- Name topper
- Wedding topper
- Monogram topper

Sizing is based on cake diameter, visible design height, width, and stake depth.

### 9.2 Side Cake Charm

A small charm placed on the side of the cake.

Examples:

- Bakery logo charm
- Small name charm
- Small number charm
- Decorative icon

Sizing is usually much smaller than a top topper.

### 9.3 Cupcake Charm

A small charm used on cupcakes.

Examples:

- Mini name
- Mini number
- Mini icon
- Mini logo

Cupcake charms should normally stay below 40mm unless manually overridden.

### 9.4 Logo Cake Charm

A bakery or business branding charm.

Default recommended size is usually 30–40mm wide, with larger options for complex logos.

### 9.5 Number Topper

An age or number-based topper.

Examples:

- 1
- 21
- 40
- Happy 30th

Can be more visually dominant than standard text toppers.

### 9.6 Monogram Topper

Wedding initials or decorative letter combinations.

Examples:

- AK
- S & M
- A + K

Needs rule-based warnings around visual balance and thin joins, but no automatic geometry inspection in Phase 1.

---

## 10. Cake Size Conversion

The app must convert cake size from inches to millimetres.

| Cake Size | Diameter in mm |
|---|---:|
| 4 inch | 101.6 mm |
| 6 inch | 152.4 mm |
| 8 inch | 203.2 mm |
| 10 inch | 254 mm |

All final recommendations must be displayed in **millimetres**.

---

## 11. Phase 1 User Journey

### Step 1 — Open Sizing Assistant

User opens the new **Sizing Assistant** tab inside ENS Designer.

### Step 2 — Upload Design

User uploads either:

- SVG — preferred
- PNG — allowed for preview/reference

### Step 3 — Select Product Details

User selects:

- Product type
- Cake size
- Material
- Design use
- Font category
- Number of text lines
- Stake option, if applicable

### Step 4 — Analyse Design

The app calculates:

- Original dimensions
- Aspect ratio
- Aspect ratio category
- Recommended visible width
- Recommended visible height
- Height-limit adjustment, if needed
- Stake depth, if applicable
- Total cut height, if applicable
- Warning status

### Step 5 — Preview Design on Cake Guide

The app shows:

- Uploaded design preview
- Cake footprint circle
- Width guide
- Height guide
- Recommended size labels
- Status badge

### Step 6 — Review Recommendation

The user reviews:

- Recommended size
- Acceptable range
- Warnings
- Suggested actions
- Stake recommendation

### Step 7 — Manual Override

User can manually adjust the width or height.

When one dimension changes, the other updates automatically to preserve aspect ratio.

### Step 8 — Export

User exports the correctly scaled SVG.

---

## 12. UI Layout Specification

The Sizing Assistant should use a clear three-panel layout.

---

### 12.1 Left Panel — Inputs

#### Required Inputs

| Field | Type | Required | Notes |
|---|---|---:|---|
| Upload design | File upload | Yes | SVG/PNG |
| Product type | Dropdown | Yes | See supported product types |
| Cake size | Dropdown | Yes | 4", 6", 8", 10" |

#### Optional Inputs

| Field | Type | Required | Default |
|---|---|---:|---|
| Material | Dropdown | No | 3mm acrylic |
| Design use | Dropdown | No | Hero topper |
| Number of text lines | Number/dropdown | No | Unknown |
| Font category | Dropdown | No | Unknown |
| Stake setting | Dropdown | No | Auto |
| Maximum allowed width | Number mm | No | Empty |
| Maximum allowed height | Number mm | No | Empty |
| Customer requested size | Number mm | No | Empty |
| Override recommendation | Toggle | No | Off |

---

### 12.2 Product Type Dropdown Values

```text
Top cake topper
Side cake charm
Cupcake charm
Logo cake charm
Number topper
Monogram topper
```

---

### 12.3 Cake Size Dropdown Values

```text
4 inch
6 inch
8 inch
10 inch
```

---

### 12.4 Material Dropdown Values

```text
3mm acrylic
Mirror acrylic
Layered acrylic
3mm plywood
Other
```

Material affects warning messages and stake recommendation, but does not need advanced geometry logic in Phase 1.

---

### 12.5 Design Use Dropdown Values

```text
Hero topper
Subtle charm
Logo branding
Cupcake decoration
Wedding/monogram
Number feature
```

---

### 12.6 Font Category Dropdown Values

```text
Unknown
Script
Serif
Sans-serif
Chunky
Thin
Handwritten
Decorative
```

This should support rule-based warnings only.

Example:

If user selects **Thin**, show warning:

```text
Thin fonts may become fragile when cut small. Check stroke thickness manually before cutting.
```

---

### 12.7 Stake Setting Values

```text
Auto
No stake
Single stake
Double stake
```

For non-topper product types, stake fields should be hidden or disabled.

---

## 13. Centre Panel — Preview

The centre panel should show a visual preview of the design.

### 13.1 Preview Requirements

The preview must display:

- Uploaded design
- Cake footprint guide
- Recommended visible size
- Width measurement label
- Height measurement label
- Aspect ratio locked indicator

### 13.2 Cake Footprint Guide

For cake-based products, show a circle representing the selected cake diameter.

The design should be displayed proportionally over or near the cake guide.

For side charms and cupcake charms, the cake guide can be less dominant, but should still provide scale context.

### 13.3 Preview Modes

Phase 1 should include one default preview mode:

```text
Top view
```

Optional but not required for MVP:

```text
Side charm view
Cut file view
```

If implementation time is limited, only build one preview view first.

---

## 14. Right Panel — Recommendation Card

The right panel should show the recommendation clearly.

### 14.1 Recommendation Card Fields

| Field | Example |
|---|---|
| Status | Good to cut |
| Product type | Top cake topper |
| Cake size | 6 inch |
| Cake diameter | 152.4 mm |
| Aspect ratio | 1.35 |
| Aspect category | Balanced |
| Recommended visible width | 120 mm |
| Recommended visible height | 89 mm |
| Acceptable width range | 105–130 mm |
| Stake depth | 45 mm |
| Total cut height | 134 mm |
| Stake recommendation | Double stake |
| Scale factor | 0.62x |
| Warning list | Design is very wide |
| Suggested actions | Consider stacking words |

---

## 15. Status Logic

The feature should produce one of these statuses.

### 15.1 Good to Cut

Use when:

- Design fits within recommended width range
- Height is within recommended height guidance
- Aspect ratio is balanced or acceptable
- No major rule-based warnings are triggered

### 15.2 Needs Review

Use when:

- Design is wide or tall
- Font category suggests possible fragility
- Product is small and details may become hard to read
- User has manually overridden recommendation
- PNG has been uploaded instead of SVG

### 15.3 Too Wide

Use when:

- Aspect ratio is very wide
- Scaling to fit cake width makes text too small
- Width exceeds user-defined max width
- Width exceeds product-specific max guidance

### 15.4 Too Tall

Use when:

- Resulting height exceeds cake/product height guidance
- Aspect ratio is very tall
- Height-limiting causes width to become too small

### 15.5 Too Small

Use when:

- Recommended scale results in very small final dimensions
- Cupcake or charm detail may become unreadable
- Logo/text is below practical visual size

### 15.6 Not Recommended

Use sparingly.

Use when:

- Design cannot reasonably fit selected cake/product type
- Required manual override is far outside safe guidance
- PNG-only file is being used for final production export
- SVG dimensions cannot be detected and user has not entered manual dimensions

---

## 16. Aspect Ratio Logic

The app must calculate:

```text
aspect_ratio = design_width / design_height
```

### 16.1 Aspect Ratio Categories

| Category | Ratio |
|---|---:|
| Very tall | Below 0.5 |
| Tall | 0.5–0.8 |
| Balanced | 0.8–1.4 |
| Wide | 1.4–2.2 |
| Very wide | Above 2.2 |

### 16.2 Aspect Ratio Behaviour

#### Balanced

Use preferred width near the middle or upper-middle of the product range.

#### Wide

Use more conservative width.

Warn if final height becomes too small.

#### Very Wide

Reduce width and warn that layout may need review.

Example message:

```text
This design is very wide. It may look too small once scaled to fit the cake. Consider stacking the words.
```

#### Tall

Check height limit carefully.

#### Very Tall

Use height as the limiting factor first.

Example message:

```text
This design is very tall. It may overpower the cake. Consider reducing the number of lines or using a wider layout.
```

---

## 17. Sizing Rules

All sizing rules must be configurable.

Recommended file:

```text
sizingRules.ts
```

The file should contain:

- Cake size conversions
- Product type sizing ranges
- Height limits
- Stake depth rules
- Aspect ratio categories
- Warning thresholds
- Default material assumptions
- Charm size limits
- Manual override thresholds

---

## 18. Product-Specific Sizing Rules

### 18.1 Top Cake Topper

Recommended visible width range:

| Cake Size | Cake Diameter | Width Range |
|---|---:|---:|
| 4 inch | 101.6 mm | 70–85 mm |
| 6 inch | 152.4 mm | 105–130 mm |
| 8 inch | 203.2 mm | 135–165 mm |
| 10 inch | 254 mm | 165–200 mm |

Preferred width should be calculated within the range based on aspect ratio.

Suggested default preferred values:

| Cake Size | Preferred Width |
|---|---:|
| 4 inch | 78 mm |
| 6 inch | 120 mm |
| 8 inch | 150 mm |
| 10 inch | 180 mm |

---

### 18.2 Side Cake Charm

| Use Case | Suggested Width |
|---|---:|
| Small logo charm | 30–40 mm |
| Medium logo charm | 40–50 mm |
| Large logo charm | 50–60 mm |
| Small name charm | 35–50 mm |
| Decorative icon charm | 25–40 mm |

Default preferred width:

```text
40 mm
```

---

### 18.3 Cupcake Charm

| Use Case | Suggested Width |
|---|---:|
| Mini icon | 20–25 mm |
| Mini number | 20–30 mm |
| Mini name | 25–35 mm |
| Mini logo | 25–35 mm |

Default preferred width:

```text
30 mm
```

Maximum recommended width:

```text
40 mm
```

If user overrides above 40mm, show warning.

---

### 18.4 Logo Cake Charm

Default range:

```text
30–40 mm
```

For complex logos:

```text
40–50 mm
```

For very detailed or wide logos:

```text
50–60 mm with warning
```

---

### 18.5 Number Topper

| Cake Size | Width Range |
|---|---:|
| 4 inch | 70–85 mm |
| 6 inch | 110–140 mm |
| 8 inch | 140–175 mm |
| 10 inch | 170–210 mm |

Number toppers can be larger because they are usually hero decorations.

---

### 18.6 Monogram Topper

| Cake Size | Width Range |
|---|---:|
| 4 inch | 70–85 mm |
| 6 inch | 110–130 mm |
| 8 inch | 140–165 mm |
| 10 inch | 165–200 mm |

Show manual review warnings for:

- Thin initials
- Ampersands
- Internal counters
- Disconnected letters
- Fragile joins

No automatic geometry analysis in Phase 1.

---

## 19. Height Rules

The app must recommend both width and height.

### 19.1 Topper Visible Height Limits

Visible height excludes stake depth.

| Cake Size | Suggested Max Visible Height |
|---|---:|
| 4 inch | 80–100 mm |
| 6 inch | 100–130 mm |
| 8 inch | 120–160 mm |
| 10 inch | 150–190 mm |

Suggested default max visible height:

| Cake Size | Max Visible Height |
|---|---:|
| 4 inch | 90 mm |
| 6 inch | 120 mm |
| 8 inch | 145 mm |
| 10 inch | 175 mm |

### 19.2 Height Calculation

```text
final_height = final_width / aspect_ratio
```

### 19.3 Height-Limited Calculation

If the calculated height exceeds the max visible height:

```text
adjusted_width = max_visible_height × aspect_ratio
adjusted_height = max_visible_height
```

Then compare adjusted width against the minimum recommended width.

If adjusted width becomes too small, show:

```text
This design only fits if reduced significantly. Consider changing the layout rather than cutting it at this size.
```

---

## 20. Stake Logic

Stake logic applies only to:

```text
Top cake topper
Number topper
Monogram topper
```

Stake logic does not apply to:

```text
Side cake charm
Cupcake charm
Logo cake charm
```

### 20.1 Stake Depth by Cake Size

| Cake Size | Recommended Stake Depth |
|---|---:|
| 4 inch | 35–45 mm |
| 6 inch | 40–50 mm |
| 8 inch | 45–60 mm |
| 10 inch | 50–65 mm |

Suggested default values:

| Cake Size | Default Stake Depth |
|---|---:|
| 4 inch | 40 mm |
| 6 inch | 45 mm |
| 8 inch | 50 mm |
| 10 inch | 60 mm |

### 20.2 Single vs Double Stake Rule

Recommend **double stake** when:

- Product type is top cake topper, number topper, or monogram topper
- Recommended visible width exceeds 120mm
- Material is mirror acrylic
- Material is layered acrylic
- Design use is hero topper
- User manually selects double stake

Recommend **single stake** when:

- Design width is below or equal to 120mm
- Design is visually centred
- Material is standard 3mm acrylic or plywood
- User manually selects single stake

### 20.3 Total Cut Height

The app must show:

```text
visible design height
stake depth
total cut height
```

Formula:

```text
total_cut_height = visible_design_height + stake_depth
```

Example:

```text
Visible design: 120 mm × 89 mm
Stake depth: 45 mm
Total cut height: 134 mm
```

---

## 21. Upload Behaviour

### 21.1 SVG Upload

SVG is the preferred format.

For SVG, the app should:

- Read viewBox if available
- If no viewBox, read width and height attributes
- Detect aspect ratio
- Display vector preview
- Preserve aspect ratio
- Allow scaled SVG export

If SVG dimensions cannot be detected:

- Show error
- Allow manual original width/height entry
- Do not generate final export until dimensions are available

### 21.2 PNG Upload

PNG is allowed for preview/reference.

For PNG, the app should:

- Read pixel dimensions
- Ask for DPI or use a default DPI
- Calculate approximate physical dimensions
- Display preview
- Show warning that PNG is less ideal for laser cutting

PNG warning:

```text
PNG files are useful for preview sizing, but SVG is recommended for final laser cutting because it preserves clean vector paths.
```

Phase 1 may allow PNG preview sizing, but final production SVG export should only be available when the uploaded file is SVG.

---

## 22. Calculation Requirements

The app must calculate:

1. Cake diameter in mm.
2. Product-specific width range.
3. Preferred width.
4. Uploaded design aspect ratio.
5. Aspect ratio category.
6. Recommended final width.
7. Recommended final height.
8. Whether height exceeds max guidance.
9. Whether width exceeds recommended guidance.
10. Whether manual override is outside recommended guidance.
11. Stake depth, if applicable.
12. Total cut height, if applicable.
13. Scale factor.
14. Recommendation status.
15. Warning messages.

---

## 23. Recommended Calculation Flow

```text
1. User uploads design.
2. App extracts original width and height.
3. App calculates aspect ratio.
4. User selects product type.
5. User selects cake size.
6. App loads applicable sizing rule.
7. App calculates preferred width.
8. App calculates resulting height.
9. App checks max visible height.
10. If height exceeds limit, app adjusts width proportionally.
11. App checks min/max width range.
12. App applies stake logic.
13. App generates status and warnings.
14. App displays recommendation.
15. User may override.
16. App exports scaled SVG.
```

---

## 24. Warning Engine

Phase 1 should use rule-based warnings.

### 24.1 Warning Types

| Warning | Trigger |
|---|---|
| Very wide design | Aspect ratio > 2.2 |
| Wide design | Aspect ratio 1.4–2.2 |
| Very tall design | Aspect ratio < 0.5 |
| Tall design | Aspect ratio 0.5–0.8 |
| Height exceeds guidance | Calculated height > max visible height |
| Width below recommended range | Adjusted width < minimum range |
| Width above recommended range | Width > maximum range |
| Cupcake charm too large | Width > 40mm |
| Logo may be unreadable | Logo charm below 30mm or complex logo selected |
| Thin font warning | Font category = thin/script/decorative |
| PNG warning | Uploaded file = PNG |
| Manual override warning | Override outside recommended range |
| Mirror/layered acrylic warning | Material = mirror/layered acrylic |
| Double stake recommended | Width > 120mm or material heavy |

---

## 25. Warning Message Examples

### Very wide design

```text
This design is very wide. It may look too small when scaled to fit the selected cake size. Consider stacking the words into two or three lines.
```

### Very tall design

```text
This design is very tall and may overpower the cake. Consider reducing the number of lines or using a wider layout.
```

### PNG warning

```text
PNG is suitable for preview sizing only. For laser cutting, SVG is recommended.
```

### Thin font warning

```text
Thin or script fonts may become fragile when cut small. Please manually check the thinnest parts before cutting.
```

### Cupcake charm warning

```text
Cupcake charms are normally kept under 40mm. This size may look too large on cupcakes.
```

### Manual override warning

```text
This size is outside the recommended range. Proceed only if you have checked the design manually.
```

---

## 26. Recommendation Output Format

The recommendation should be displayed clearly.

### Example: Suitable Design

```text
Recommended final cut size

Product type: Top cake topper
Cake size: 6 inch
Cake diameter: 152.4 mm
Design aspect ratio: 1.35 — Balanced

Recommended visible width: 120 mm
Recommended visible height: 89 mm
Acceptable width range: 105–130 mm

Stake depth: 45 mm
Total cut height: 134 mm
Stake recommendation: Double stake

Status: Good to cut

Notes:
- This design should sit comfortably on a 6 inch cake.
- Aspect ratio is balanced.
- Keep aspect ratio locked.
- Double stake is recommended because the design is wider than 120mm.
```

### Example: Needs Review

```text
Sizing warning

Product type: Top cake topper
Cake size: 4 inch
Cake diameter: 101.6 mm
Design aspect ratio: 2.8 — Very wide

Recommended visible width: 80 mm
Resulting visible height: 29 mm

Status: Needs review

Notes:
- The design is very wide and may look too small when scaled to fit a 4 inch cake.
- Text may become difficult to read.
- Consider stacking the words into 2 or 3 lines.
- Do not stretch vertically to compensate.
```

---

## 27. Export Requirements

### 27.1 SVG Export

For SVG uploads, the app must export a resized SVG using the recommended or manually overridden physical size.

Export must:

- Preserve aspect ratio
- Use millimetres
- Set width in mm
- Set height in mm
- Preserve original vector content
- Avoid distortion
- Avoid changing design paths unnecessarily

### 27.2 Export File Naming

Suggested format:

```text
ens-sized-[product-type]-[cake-size]-[width]x[height]mm.svg
```

Example:

```text
ens-sized-top-cake-topper-6inch-120x89mm.svg
```

### 27.3 PNG Export

PNG export is not required for Phase 1.

If PNG upload is supported, it should be for preview sizing only unless existing app export logic already supports raster output safely.

---

## 28. Data Model

Suggested internal data object:

```typescript
type SizingAssistantState = {
  uploadedFile: {
    name: string;
    type: 'svg' | 'png';
    originalWidth: number;
    originalHeight: number;
    originalUnit?: 'px' | 'mm' | 'unknown';
    viewBox?: string;
    dpi?: number;
  };

  productConfig: {
    productType:
      | 'topCakeTopper'
      | 'sideCakeCharm'
      | 'cupcakeCharm'
      | 'logoCakeCharm'
      | 'numberTopper'
      | 'monogramTopper';

    cakeSize: '4' | '6' | '8' | '10';
    material:
      | '3mmAcrylic'
      | 'mirrorAcrylic'
      | 'layeredAcrylic'
      | '3mmPlywood'
      | 'other';

    designUse:
      | 'heroTopper'
      | 'subtleCharm'
      | 'logoBranding'
      | 'cupcakeDecoration'
      | 'weddingMonogram'
      | 'numberFeature';

    numberOfLines?: number;

    fontCategory?:
      | 'unknown'
      | 'script'
      | 'serif'
      | 'sansSerif'
      | 'chunky'
      | 'thin'
      | 'handwritten'
      | 'decorative';

    stakeOption?: 'auto' | 'none' | 'single' | 'double';
  };

  recommendation: {
    cakeDiameterMm: number;
    aspectRatio: number;
    aspectCategory: 'veryTall' | 'tall' | 'balanced' | 'wide' | 'veryWide';
    recommendedWidthMm: number;
    recommendedHeightMm: number;
    acceptableMinWidthMm: number;
    acceptableMaxWidthMm: number;
    visibleHeightMm: number;
    stakeDepthMm?: number;
    totalCutHeightMm?: number;
    stakeRecommendation?: 'none' | 'single' | 'double';
    scaleFactor: number;
    status:
      | 'goodToCut'
      | 'needsReview'
      | 'tooWide'
      | 'tooTall'
      | 'tooSmall'
      | 'notRecommended';
    warnings: string[];
    notes: string[];
    isManualOverride: boolean;
  };
};
```

---

## 29. Config File Specification

Suggested file:

```text
sizingRules.ts
```

Example structure:

```typescript
export const cakeSizes = {
  '4': { label: '4 inch', diameterMm: 101.6 },
  '6': { label: '6 inch', diameterMm: 152.4 },
  '8': { label: '8 inch', diameterMm: 203.2 },
  '10': { label: '10 inch', diameterMm: 254 },
};

export const aspectRatioCategories = {
  veryTall: { max: 0.5 },
  tall: { min: 0.5, max: 0.8 },
  balanced: { min: 0.8, max: 1.4 },
  wide: { min: 1.4, max: 2.2 },
  veryWide: { min: 2.2 },
};

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
};

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
};

export const stakeRules = {
  depths: {
    '4': { min: 35, preferred: 40, max: 45 },
    '6': { min: 40, preferred: 45, max: 50 },
    '8': { min: 45, preferred: 50, max: 60 },
    '10': { min: 50, preferred: 60, max: 65 },
  },
  doubleStakeWidthThresholdMm: 120,
  heavyMaterials: ['mirrorAcrylic', 'layeredAcrylic'],
};
```

---

## 30. Functional Requirements

### FR-001 — New Tab

The system shall provide a new tab called **Sizing Assistant** inside ENS Designer.

### FR-002 — File Upload

The system shall allow the user to upload SVG or PNG files.

### FR-003 — SVG Parsing

The system shall read SVG viewBox where available.

### FR-004 — SVG Dimension Fallback

If viewBox is unavailable, the system shall attempt to read width and height attributes.

### FR-005 — Manual Dimension Entry

If dimensions cannot be detected, the system shall allow manual width and height entry.

### FR-006 — PNG Dimension Reading

The system shall read PNG pixel dimensions.

### FR-007 — PNG Warning

The system shall show a warning that PNG is not ideal for final laser cutting.

### FR-008 — Product Type Selection

The system shall allow the user to select product type.

### FR-009 — Cake Size Selection

The system shall allow the user to select 4", 6", 8", or 10" cake size.

### FR-010 — Cake Diameter Conversion

The system shall convert the selected cake size to millimetres.

### FR-011 — Aspect Ratio Calculation

The system shall calculate aspect ratio from detected or manually entered dimensions.

### FR-012 — Aspect Ratio Categorisation

The system shall categorise the design as very tall, tall, balanced, wide, or very wide.

### FR-013 — Recommended Width

The system shall calculate recommended visible width based on product type, cake size, and aspect ratio.

### FR-014 — Recommended Height

The system shall calculate recommended visible height using locked aspect ratio.

### FR-015 — Height Limit Check

The system shall check whether calculated height exceeds maximum visible height guidance.

### FR-016 — Height-Based Adjustment

If height exceeds maximum visible height, the system shall reduce width proportionally.

### FR-017 — Aspect Ratio Lock

The system shall always preserve aspect ratio.

### FR-018 — No Stretching

The system shall never independently scale width and height.

### FR-019 — Stake Depth

For topper product types, the system shall recommend stake depth.

### FR-020 — Stake Count

The system shall recommend single or double stake based on width, material, and user selection.

### FR-021 — Total Cut Height

The system shall calculate total cut height where stake applies.

### FR-022 — Visual Preview

The system shall show the uploaded design in a preview area.

### FR-023 — Cake Footprint

The system shall show the selected cake size as a visual footprint guide.

### FR-024 — Warning Engine

The system shall generate rule-based warnings.

### FR-025 — Manual Override

The system shall allow manual size override while keeping aspect ratio locked.

### FR-026 — Export Resized SVG

The system shall export a resized SVG when the source file is SVG.

### FR-027 — Configurable Rules

The system shall store sizing rules in a configurable file.

---

## 31. Non-Functional Requirements

### NFR-001 — Usability

The feature must be simple enough for daily production use.

### NFR-002 — Performance

Recommendation should update instantly or near-instantly after inputs change.

### NFR-003 — Maintainability

Sizing rules must be configurable without changing core UI logic.

### NFR-004 — Reliability

The app must avoid misleading recommendations where source dimensions are uncertain.

### NFR-005 — Transparency

The app must show why warnings were triggered.

### NFR-006 — Compatibility

The feature must not break existing ENS Designer functionality.

### NFR-007 — Production Safety

The feature must make it clear when manual review is still required.

### NFR-008 — Export Integrity

Exported SVG must preserve vector design and aspect ratio.

---

## 32. Acceptance Criteria

### AC-001 — Tab Exists

```gherkin
Given I open ENS Designer
When I view the available tabs
Then I can see a tab called "Sizing Assistant"
```

### AC-002 — Upload SVG

```gherkin
Given I am on the Sizing Assistant tab
When I upload a valid SVG
Then the design preview is displayed
And the app reads the SVG dimensions
```

### AC-003 — Upload PNG

```gherkin
Given I am on the Sizing Assistant tab
When I upload a PNG
Then the image preview is displayed
And the app shows a warning that SVG is recommended for laser cutting
```

### AC-004 — Select Cake Size

```gherkin
Given I have uploaded a design
When I select "6 inch cake"
Then the app displays the cake diameter as 152.4 mm
```

### AC-005 — Select Product Type

```gherkin
Given I have uploaded a design
When I select "Top cake topper"
Then the app uses top cake topper sizing rules
```

### AC-006 — Aspect Ratio Calculation

```gherkin
Given the uploaded design has width and height
When the app analyses the design
Then it calculates the design aspect ratio
And displays the aspect ratio category
```

### AC-007 — Recommended Size

```gherkin
Given I have uploaded a valid SVG
And selected product type and cake size
When the recommendation is generated
Then the app displays recommended width and height in millimetres
```

### AC-008 — Aspect Ratio Lock

```gherkin
Given I manually change the recommended width
When the value is updated
Then the height updates proportionally
And the design is not stretched
```

### AC-009 — Very Wide Warning

```gherkin
Given the design aspect ratio is greater than 2.2
When the recommendation is generated
Then the app categorises the design as "Very wide"
And displays a warning suggesting layout review
```

### AC-010 — Very Tall Warning

```gherkin
Given the design aspect ratio is below 0.5
When the recommendation is generated
Then the app categorises the design as "Very tall"
And displays a warning about height and visual balance
```

### AC-011 — Stake Recommendation

```gherkin
Given I select "Top cake topper"
When the recommendation is generated
Then the app displays recommended stake depth
And total cut height
```

### AC-012 — Double Stake Rule

```gherkin
Given the product type is "Top cake topper"
And the recommended visible width is greater than 120mm
When the recommendation is generated
Then the app recommends double stake
```

### AC-013 — Export Resized SVG

```gherkin
Given I uploaded an SVG
And a recommendation has been generated
When I click "Export resized SVG"
Then the app downloads an SVG with the recommended physical width and height in millimetres
And the original aspect ratio is preserved
```

### AC-014 — Missing Dimensions

```gherkin
Given I upload an SVG without usable dimensions
When the app cannot detect width and height
Then the app asks me to manually enter original width and height
And does not generate an export until dimensions are available
```

---

## 33. Error Handling

### 33.1 Unsupported File Type

Message:

```text
Unsupported file type. Please upload an SVG or PNG file.
```

### 33.2 SVG Dimensions Not Found

Message:

```text
The SVG dimensions could not be detected. Please enter the original design width and height manually.
```

### 33.3 Invalid Manual Dimensions

Message:

```text
Please enter valid width and height values greater than 0.
```

### 33.4 Export Not Available for PNG

Message:

```text
SVG export is only available for SVG uploads. Please upload the final vector SVG for production export.
```

### 33.5 Recommendation Cannot Be Generated

Message:

```text
A recommendation cannot be generated until a design, product type, and cake size are selected.
```

---

## 34. Solution Architect Review Points

The Solution Architect should review:

1. Whether the feature should reuse existing SVG preview/export components.
2. Whether sizing logic should be frontend-only or shared with backend.
3. How SVG viewBox parsing should be handled.
4. How exported SVG dimensions should be applied.
5. How existing ENS Designer state models may be reused.
6. Whether preview should use existing canvas infrastructure or a separate lightweight SVG preview component.
7. How to avoid coupling sizing rules into UI components.
8. How to structure tests for the sizing calculation engine.
9. How to ensure LightBurn/import compatibility.
10. Whether PNG support should be preview-only in Phase 1.
11. Whether stake logic should be purely advisory or linked to existing stake generation features.
12. Whether export should alter the SVG file or wrap it in a correctly sized outer SVG.

---

## 35. Suggested Implementation Approach

### Phase 1A — Foundation

- Add new tab.
- Create upload component.
- Create preview area.
- Create input form.
- Create basic recommendation card.

### Phase 1B — Sizing Engine

- Create `sizingRules.ts`.
- Create calculation utilities.
- Implement cake size conversion.
- Implement aspect ratio categorisation.
- Implement product type sizing logic.
- Implement height limit logic.

### Phase 1C — Warning Engine

- Implement rule-based warnings.
- Implement status calculation.
- Add manual review notes.
- Add material-based warnings.
- Add font-category warnings.

### Phase 1D — Stake Guidance

- Implement stake depth recommendation.
- Implement single/double stake logic.
- Display visible height vs total cut height.

### Phase 1E — Export

- Implement resized SVG export.
- Validate dimensions in mm.
- Test with LightBurn or current laser workflow.

### Phase 1F — QA and Hardening

- Test common design scenarios.
- Test edge cases.
- Test bad SVGs.
- Test PNG warnings.
- Test manual overrides.
- Test export integrity.

---

## 36. Manual QA Test Designs

The team should test with:

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

---

## 37. Final MVP Definition

Phase 1 is complete when the user can:

```text
Upload a final SVG,
select product type and cake size,
see a recommended physical cut size in mm,
understand whether the design is balanced, wide, tall, too large, or too small,
see stake guidance where relevant,
manually override while preserving aspect ratio,
and export a correctly scaled SVG for laser cutting.
```

---

## 38. Final Product Decision

### Recommendation

Proceed with Phase 1.

This feature is valuable, aligned with the Etch ’n’ Shine production workflow, and practical to implement if the scope remains focused.

### Critical MVP Rule

Do not allow Phase 1 to turn into a CAD-style geometry validator.

Phase 1 should remain:

```text
Sizing + aspect ratio + visual balance + rule-based production warnings + SVG export.
```

### Explicit Phase 1 Exclusion

```text
Automatic laser safety geometry analysis is excluded from Phase 1.
```

### Final Verdict

```text
Approved for Solution Architect review.

The feature should be implemented as a configurable, rule-based production sizing assistant. The implementation approach should prioritise clean separation between UI, sizing rules, calculation engine, warning engine, and export handling.
```

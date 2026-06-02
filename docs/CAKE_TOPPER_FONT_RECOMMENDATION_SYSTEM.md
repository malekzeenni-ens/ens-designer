# Cake Topper Font Recommendation System

## Purpose

The Cake Topper Font Advisor helps Etch N Shine choose fonts that are more suitable for laser-cut cake toppers, especially 3mm acrylic designs.

The system improves font discovery and selection only. It does not change the Cake Topper geometry engine, SVG export contract, PNG preview flow, visual overlap behavior, stake generation, or LightBurn verification requirement.

## Font Inventory

On this machine the backend `FontCatalog` currently discovers 1028 deduped fonts from:

- Repo-local Etch N Shine project fonts: `fonts/` (698 fonts)
- Windows system fonts: `C:\Windows\Fonts`

The repository `fonts/` directory is now the source of truth for Etch N Shine production fonts. The old machine-specific Dropbox font library path is no longer scanned by the backend.

## Scoring Model

Fonts are scored out of 100 using practical cake-topper criteria:

| Category | Max Score |
| --- | ---: |
| Laser-cut structural suitability | 35 |
| Cake topper aesthetics | 25 |
| Readability | 15 |
| Weldability / joining potential | 15 |
| Pairing flexibility | 10 |

The current implementation uses manual overrides for known production-relevant fonts and heuristic fallback classification for the remaining loaded fonts. It does not perform live vector stroke-width simulation or material strength analysis.

## Top 20 Cake Topper Fonts

Thick Black was added at rank 11 following a structural review (see Heuristic Revision below). Ranks 12–20 shifted accordingly; Bodoni MT Bold moved to Next Best 20.

| Rank | Font Name | Type | Score | Best Use | Why It Works | Risk Notes |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | Anton | Display | 95 | Bold names, numbers, birthday centre lines | Heavy strokes, simple counters, compact letterforms | Can feel too blocky for very elegant wedding designs |
| 2 | Cooper Black | Serif | 94 | Children's toppers, retro birthdays, chunky names | Rounded, weighty forms cut strongly while staying playful | Large counters need checking at very small sizes |
| 3 | Arial Rounded MT Bold | Sans-serif | 93 | Supporting text, children's names, soft modern toppers | Rounded terminals avoid brittle points | Less distinctive as a main display font |
| 4 | Bebas Neue | Sans-serif | 92 | Tall names, numbers, modern birthday toppers | Tall condensed capitals are clean and strong | Best for uppercase or short words |
| 5 | Rockwell Extra Bold | Serif | 91 | Luxury acrylic, bold numbers, formal supporting text | Slab serifs add premium character without fragile hairlines | Check tight counters after heavy overlap |
| 6 | Quicksand Bold | Sans-serif | 90 | Supporting phrases, baby shower, modern minimal toppers | Rounded geometry stays readable and safe | Use larger sizes for long phrases |
| 7 | Raleway ExtraBold | Sans-serif | 89 | Modern toppers, supporting text, clean names | Crisp but heavy enough for acrylic | Avoid thin Raleway weights |
| 8 | Sunlight Script Bold | Script | 88 | Names, wedding toppers, birthday names | Bolder script gives elegance with usable stroke weight | Swashes and dots need review |
| 9 | Roboto Condensed Bold | Sans-serif | 87 | Supporting text, long phrases, modern toppers | Fits long wording while keeping strokes substantial | Pair with a decorative main font |
| 10 | Balgon Bold Bold | Display | 86 | Bold names, birthday toppers, number-led designs | Strong display weight without being plain | Check unusual joins after aggressive overlap |
| 11 | **Thick Black** | Display | 85 | Bold names, birthday statements, chunky casual toppers | Extremely heavy uniform strokes — virtually zero fragile cut points; one of the most structurally safe fonts for 3mm acrylic | Very wide letterforms; allow extra horizontal space in multi-word layouts |
| 12 | Britannic Bold | Sans-serif | 84 | Names, short phrases, bold birthdays | Wide, heavy forms are readable and resilient | Style may not suit delicate themes |
| 13 | Century Gothic Bold | Sans-serif | 84 | Modern minimal, supporting text, baby shower | Clean round geometry keeps wording calm | Large counters need checking when reduced |
| 14 | Arial Black | Sans-serif | 83 | Numbers, bold supporting text, very small words | Very heavy strokes survive cutting | Plain look |
| 15 | Bermula Extra Bold | Sans-serif | 82 | Modern names, supporting phrases, birthdays | Extra Bold weight keeps the family practical | Avoid Bermula Light |
| 16 | Bookman Old Style Bold | Serif | 81 | Luxury toppers, anniversary, formal words | Bold serif forms have better strength than thin formal serifs | Serif details need preview checks |
| 17 | SignPainter Medium | Script | 80 | Names, wedding toppers, premium birthdays | Readable script with more body than fine calligraphy | Check detached dots and swashes |
| 18 | Satisfy | Script | 79 | Names, friendly toppers, birthday scripts | Friendly connected script with good readability | Use larger size and inspect joins |
| 19 | Bailey Sidney Script | Script | 78 | Names, wedding designs, elegant birthdays | Decorative enough for premium work | Review thin terminals and detached marks |
| 20 | Roboto Black | Sans-serif | 77 | Numbers, supporting text, modern toppers | Plain, heavy, and predictable | Best when another font carries personality |

## Next Best 20 Fonts

Bodoni MT Bold moved here from rank 20 after the Thick Black insertion.

| Rank | Font Name | Type | Score | Best Use | Why It Works | Risk Notes |
| ---: | --- | --- | ---: | --- | --- | --- |
| 21 | Bodoni MT Bold | Serif | 76 | Luxury acrylic, formal names, anniversary | Elegant contrast gives a premium look | Thin contrast strokes and serifs are more fragile |
| 22 | League Spartan ExtraBold | Sans-serif | 75 | Bold names, modern birthdays, supporting phrases | Heavy geometric shapes give strong acrylic-safe strokes | Avoid lighter weights |
| 23 | Oswald Bold | Sans-serif | 74 | Tall names, numbers, long supporting text | Condensed bold letterforms fit longer wording | Avoid ExtraLight and Light |
| 24 | Pacifico | Script | 73 | Friendly names, birthday toppers, casual celebrations | Rounded connected script has usable body | Inspect joins, dots, and entry strokes |
| 25 | Peanut Butter | Display | 72 | Playful names, children's birthdays, chunky casual toppers | Bold rounded display shapes are friendly and practical | Preview unusual letter shapes and counters |
| 26 | Josefin Sans Bold | Sans-serif | 71 | Modern names, baby shower, supporting text | Elegant geometry stays readable in Bold | Avoid thin and light weights |
| 27 | Lora Bold | Serif | 70 | Formal names, anniversary toppers, luxury supporting text | Refined serif look with useful weight | Inspect serif details and counters |
| 28 | Cairo Bold | Sans-serif | 69 | Supporting text, modern phrases, multilingual-friendly layouts | Open counters and sturdy strokes | Avoid very small sizes in lighter weights |
| 29 | League Spartan Bold | Sans-serif | 68 | Supporting phrases, modern names, numbers | Bold geometry cuts cleanly | Use heavier weights for small words |
| 30 | Oswald SemiBold | Sans-serif | 67 | Long phrases, modern supporting text, tall layouts | Readable condensed forms with more breathing room | Use Bold for smaller cuts |
| 31 | Josefin Sans SemiBold | Sans-serif | 66 | Supporting phrases, modern minimal toppers, baby shower | Elegant proportions remain usable at topper scale | Avoid thin substitutions |
| 32 | Lora SemiBold | Serif | 65 | Formal supporting text, anniversary, wedding dates | Premium feel with enough substance for moderate sizes | Prefer Bold for small wording |
| 33 | Freestyle Script | Script | 64 | Large names, casual birthday toppers | Familiar casual script can work when kept large | Thin strokes and detached details need checks |
| 34 | Buttercup Script | Script | 63 | Names, friendly toppers, soft celebrations | Decorative script suits personalised toppers | Review loops, thin terminals, detached marks |
| 35 | Lucida Calligraphy Italic | Script | 62 | Formal names, wedding toppers | Elegant calligraphic styling when enlarged | Fine details are fragile |
| 36 | Bickham Script Pro Semibold | Script | 61 | Wedding names, luxury toppers | Semibold weight is more realistic than lighter calligraphy | Fine details need inspection |
| 37 | Sophia | Script | 60 | Names, birthday toppers, soft personalised designs | Friendly script pairs well with block supporting text | Inspect dots and thin tails |
| 38 | Rellista Script | Script | 59 | Names, wedding toppers, elegant birthdays | Decorative script character for larger names | Swashes and thin joins need review |
| 39 | bromello | Script | 58 | Names, casual wedding toppers, birthday scripts | Connected styling works for enlarged personalisation | Inspect thin joins and detached details |
| 40 | Cairo Black | Sans-serif | 57 | Small phrases, numbers, strong supporting text | Black weight gives excellent stroke strength | Plain as a main decorative font |

## Font Categories

The UI classifies fonts into these categories:

- Top 20
- Next Best 20
- Script
- Serif
- Sans
- Supporting Text
- Use With Caution
- Not Recommended
- All Fonts A-Z / Uncategorised

If a font is not manually configured, it is still shown. The fallback classifier uses font names and styles to infer broad categories such as script, serif, sans-serif, decorative, thin, symbol, outline, shadow, swash, monogram, and bold.

## Heuristic Scoring Tiers (updated after Thick Black review)

The heuristic classifier now distinguishes three weight tiers:

| Tier | Detected by | Score range | Category |
| --- | --- | --- | --- |
| Ultra-heavy | `black`, `heavy`, `ultra`, `thick`, `fat`, `poster`, `jumbo`, `chubby` in font name | 62–79 depending on type | `sans_serif` (not `supporting_text`) |
| Bold | `bold`, `extrabold`, `semibold`, `demi` in font name | 55–74 depending on type | type-appropriate |
| Regular | No weight keyword | 42–68 depending on type | type-appropriate |

**Why ultra-heavy fonts score higher:** Fonts with Black, Heavy, Ultra, or Thick weight designations have uniform thick strokes that leave virtually no fragile cut points in 3mm acrylic. This was confirmed during the Thick Black manual review — the font was initially missing from the manual list and receiving a heuristic score of 76 in `supporting_text`. After review it was promoted to rank 11 in `top_10` (score 85). The heuristic was then revised to automatically surface similar fonts.

**Ultra-heavy fonts receive:**
- Score 79 for sans/display (was 76, moved from `supporting_text` to `sans_serif` so they appear prominently)
- Score 76 for serif (was 62 for regular bold)
- Score 74 for script (was 64 for regular bold)
- Score 62 for decorative (still cautious, but recognised as structurally better)

Each ultra-heavy heuristic entry gets specific `whyItWorks` and `riskNotes` copy explaining the structural advantage.

**To promote a specific ultra-heavy font above the heuristic score**, add a manual override in `CAKE_TOPPER_FONT_RECOMMENDATIONS` with `manualPriority: true` and a `recommendedRank`.

## Manual Override Workflow

Manual rankings live in:

`frontend/src/config/cakeTopperFontRecommendations.ts`

To promote or demote a font, edit or add an entry in `CAKE_TOPPER_FONT_RECOMMENDATIONS`.

Example:

```ts
{
  fontName: "Example Font",
  manualPriority: true,
  recommendedRank: 3,
  category: "top_10",
  score: 94,
  riskLevel: "low",
  notes: "Works very well for acrylic cake toppers.",
  whyItWorks: "Heavy connected strokes and readable counters.",
  riskNotes: "Still inspect detached dots before cutting.",
  bestUse: ["Names", "Birthday toppers"],
  type: "script",
}
```

Manual overrides take priority over heuristic classification. UI ordering respects `recommendedRank`, then `rank`, then score, then A-Z name.

## Font Pairings

| Pairing Type | Main Font | Supporting Font | Best For | Notes |
| --- | --- | --- | --- | --- |
| Elegant wedding topper | Sunlight Script Bold | Rockwell Extra Bold | Names with formal dates or Mr & Mrs | Script gives softness; slab serif keeps small words strong |
| Children's birthday topper | Cooper Black | Quicksand Bold | One, Two, First Birthday | Rounded heavy forms feel playful and forgiving |
| Bold number topper | Anton | Roboto Condensed Bold | Age numbers with short phrases | Both fonts keep high stroke weight |
| Luxury acrylic topper | Bodoni MT Bold | Raleway ExtraBold | Anniversary and premium names | High-contrast serif plus stable sans |
| Modern minimal topper | Bebas Neue | Century Gothic Bold | Clean birthday and event wording | Tall display type plus geometric support |
| Baby shower topper | Bailey Sidney Script | Arial Rounded MT Bold | Baby Shower and first names | Soft script plus rounded sans |
| Anniversary topper | SignPainter Medium | Bookman Old Style Bold | Names plus dates | Script names with formal serif date |
| First birthday topper | Satisfy | Cooper Black | Script name plus chunky age word | Friendly and celebratory |
| Script name + block phrase | Sophia | Anton | Name over Happy Birthday | Decorative name plus sturdy block phrase |
| Two-line name and age | Quince Script | Roboto Black | Name plus age or short event word | Keep script large and support text bold |

## UI Usage

### Designer tab

- Dark branded header with logo, export status, Reset, Download SVG, and Download PNG.
- Font selector shows recommended groups first (Top 20, Next Best 20, Script, etc.).
- Font search and category filtering available.
- Every loaded font available through All Fonts A-Z.
- Recommendation labels (Top 20, Script, Sans, Use With Caution) shown in font option list.
- Same recommendation-first ordering in per-line font selectors.
- Default overlap shortcuts: Light / Auto / Medium / Strong.

### Font Adviser tab

The Font Adviser tab uses the same dark navy header as the Designer (logo, title "Font Adviser", stats showing loaded fonts / manual rules / top picks).

All sections are collapsible accordions. Default state:

| Section | Default |
| --- | --- |
| Scoring Model | Open |
| Font Rankings (Top 20 + Next Best 20 side by side) | Open |
| Font Pairings | Collapsed |
| Font Categories (4-column grid: Script / Serif / Sans-serif / Supporting Text) | Open |
| Use With Caution & Not Recommended (2 columns) | Collapsed |
| Production Notes | Open |

The Font Rankings accordion shows Top 20 and Next Best 20 as two side-by-side tables inside one accordion. The Font Categories accordion shows all four category pill lists in a four-column grid inside one accordion. The caution sections are combined in one accordion with amber and red column labels respectively.

## Testing New Fonts

Use the required name and phrase sets from the phase prompt:

Names:

- Olivia
- Amelia
- Noah
- Theo
- Isla
- Sophia
- Jamie
- Muhammad
- Charlotte
- Arabella

Phrases:

- Happy Birthday
- One
- Two
- Three
- Thirty
- Mr & Mrs
- Baby Shower
- First Birthday
- Christening
- Anniversary

For each serious candidate font:

1. Generate a topper.
2. Check the preview for missing glyphs.
3. Check counters in a, e, o, b, d, p, g, A, O, P, R.
4. Check dots on i and j.
5. Export SVG.
6. Open in LightBurn.
7. Verify size, visibility, path behavior, and connection points.
8. Run a scrap material test cut before promoting the font.

## Known Limits

- Rankings are practical heuristics plus manual production judgement, not physics simulation.
- The app visually overlaps paths but does not boolean-union or certify the final design as structurally cut-ready.
- PNG preview is not the production cutting file.
- LightBurn inspection remains required before cutting.

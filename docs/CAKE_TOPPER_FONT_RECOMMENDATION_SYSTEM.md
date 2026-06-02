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
| 11 | Britannic Bold | Sans-serif | 85 | Names, short phrases, bold birthdays | Wide, heavy forms are readable and resilient | Style may not suit delicate themes |
| 12 | Century Gothic Bold | Sans-serif | 84 | Modern minimal, supporting text, baby shower | Clean round geometry keeps wording calm | Large counters need checking when reduced |
| 13 | Arial Black | Sans-serif | 83 | Numbers, bold supporting text, very small words | Very heavy strokes survive cutting | Plain look |
| 14 | Bermula Extra Bold | Sans-serif | 82 | Modern names, supporting phrases, birthdays | Extra Bold weight keeps the family practical | Avoid Bermula Light |
| 15 | Bookman Old Style Bold | Serif | 81 | Luxury toppers, anniversary, formal words | Bold serif forms have better strength than thin formal serifs | Serif details need preview checks |
| 16 | SignPainter Medium | Script | 80 | Names, wedding toppers, premium birthdays | Readable script with more body than fine calligraphy | Check detached dots and swashes |
| 17 | Satisfy | Script | 79 | Names, friendly toppers, birthday scripts | Friendly connected script with good readability | Use larger size and inspect joins |
| 18 | Bailey Sidney Script | Script | 78 | Names, wedding designs, elegant birthdays | Decorative enough for premium work | Review thin terminals and detached marks |
| 19 | Roboto Black | Sans-serif | 77 | Numbers, supporting text, modern toppers | Plain, heavy, and predictable | Best when another font carries personality |
| 20 | Bodoni MT Bold | Serif | 76 | Luxury acrylic, formal names, anniversary | Elegant contrast gives a premium look | Thin contrast strokes and serifs are more fragile |

## Next Best 20 Fonts

| Rank | Font Name | Type | Score | Best Use | Why It Works | Risk Notes |
| ---: | --- | --- | ---: | --- | --- | --- |
| 21 | League Spartan ExtraBold | Sans-serif | 75 | Bold names, modern birthdays, supporting phrases | Heavy geometric shapes give strong acrylic-safe strokes | Avoid lighter weights |
| 22 | Oswald Bold | Sans-serif | 74 | Tall names, numbers, long supporting text | Condensed bold letterforms fit longer wording | Avoid ExtraLight and Light |
| 23 | Pacifico | Script | 73 | Friendly names, birthday toppers, casual celebrations | Rounded connected script has usable body | Inspect joins, dots, and entry strokes |
| 24 | Peanut Butter | Display | 72 | Playful names, children's birthdays, chunky casual toppers | Bold rounded display shapes are friendly and practical | Preview unusual letter shapes and counters |
| 25 | Josefin Sans Bold | Sans-serif | 71 | Modern names, baby shower, supporting text | Elegant geometry stays readable in Bold | Avoid thin and light weights |
| 26 | Lora Bold | Serif | 70 | Formal names, anniversary toppers, luxury supporting text | Refined serif look with useful weight | Inspect serif details and counters |
| 27 | Cairo Bold | Sans-serif | 69 | Supporting text, modern phrases, multilingual-friendly layouts | Open counters and sturdy strokes | Avoid very small sizes in lighter weights |
| 28 | League Spartan Bold | Sans-serif | 68 | Supporting phrases, modern names, numbers | Bold geometry cuts cleanly | Use heavier weights for small words |
| 29 | Oswald SemiBold | Sans-serif | 67 | Long phrases, modern supporting text, tall layouts | Readable condensed forms with more breathing room | Use Bold for smaller cuts |
| 30 | Josefin Sans SemiBold | Sans-serif | 66 | Supporting phrases, modern minimal toppers, baby shower | Elegant proportions remain usable at topper scale | Avoid thin substitutions |
| 31 | Lora SemiBold | Serif | 65 | Formal supporting text, anniversary, wedding dates | Premium feel with enough substance for moderate sizes | Prefer Bold for small wording |
| 32 | Freestyle Script | Script | 64 | Large names, casual birthday toppers | Familiar casual script can work when kept large | Thin strokes and detached details need checks |
| 33 | Buttercup Script | Script | 63 | Names, friendly toppers, soft celebrations | Decorative script suits personalised toppers | Review loops, thin terminals, detached marks |
| 34 | Lucida Calligraphy Italic | Script | 62 | Formal names, wedding toppers | Elegant calligraphic styling when enlarged | Fine details are fragile |
| 35 | Bickham Script Pro Semibold | Script | 61 | Wedding names, luxury toppers | Semibold weight is more realistic than lighter calligraphy | Fine details need inspection |
| 36 | Sophia | Script | 60 | Names, birthday toppers, soft personalised designs | Friendly script pairs well with block supporting text | Inspect dots and thin tails |
| 37 | Rellista Script | Script | 59 | Names, wedding toppers, elegant birthdays | Decorative script character for larger names | Swashes and thin joins need review |
| 38 | bromello | Script | 58 | Names, casual wedding toppers, birthday scripts | Connected styling works for enlarged personalisation | Inspect thin joins and detached details |
| 39 | Cairo Black | Sans-serif | 57 | Small phrases, numbers, strong supporting text | Black weight gives excellent stroke strength | Plain as a main decorative font |
| 40 | Raleway Black | Sans-serif | 56 | Modern names, supporting phrases, bold numbers | Clean look with stronger cut weight | Avoid Thin, Light, and ExtraLight |

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

The Designer tab now:

- Shows recommended font groups first in the base font selector.
- Adds font search and category filtering.
- Keeps every loaded font available through All Fonts A-Z.
- Shows recommendation labels such as Top 20, Next Best 20, Script, Sans, and Use With Caution.
- Uses the same recommendation-first ordering in per-line selectors.

The Font Advisor tab shows:

- The scoring model.
- Top 20 fonts.
- Next Best 20 fonts.
- Category previews.
- Pairing recommendations.
- Use-with-caution and not-recommended lists.
- Practical production notes.

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

import type { FontInfo } from "../types/design";

export type CakeTopperFontCategory =
  | "top_10"
  | "next_best_10"
  | "script"
  | "serif"
  | "sans_serif"
  | "supporting_text"
  | "use_with_caution"
  | "not_recommended"
  | "uncategorised";

export type CakeTopperFontType =
  | "script"
  | "serif"
  | "sans-serif"
  | "display"
  | "decorative"
  | "unknown";

export type CakeTopperRiskLevel = "low" | "medium" | "high";

export interface CakeTopperFontClassification {
  fontName: string;
  score: number;
  rank?: number;
  category: CakeTopperFontCategory;
  type: CakeTopperFontType;
  bestUse: string[];
  riskLevel: CakeTopperRiskLevel;
  notes: string;
  whyItWorks: string;
  riskNotes: string;
  pairingSuggestions?: string[];
  manualPriority?: boolean;
  recommendedRank?: number;
}

export interface FontPairingRecommendation {
  pairingType: string;
  mainFont: string;
  supportingFont: string;
  bestFor: string;
  notes: string;
}

export const FONT_CATEGORY_LABELS: Record<CakeTopperFontCategory, string> = {
  top_10: "Top 10",
  next_best_10: "Next Best",
  script: "Script",
  serif: "Serif",
  sans_serif: "Sans",
  supporting_text: "Supporting Text",
  use_with_caution: "Use With Caution",
  not_recommended: "Not Recommended",
  uncategorised: "All Fonts A-Z",
};

export const FONT_TYPE_LABELS: Record<CakeTopperFontType, string> = {
  script: "Script",
  serif: "Serif",
  "sans-serif": "Sans-serif",
  display: "Display",
  decorative: "Decorative",
  unknown: "Unknown",
};

export const CAKE_TOPPER_FONT_RECOMMENDATIONS: CakeTopperFontClassification[] = [
  {
    fontName: "Anton",
    score: 95,
    rank: 1,
    recommendedRank: 1,
    category: "top_10",
    type: "display",
    bestUse: ["Bold names", "Numbers", "Birthday centre lines"],
    riskLevel: "low",
    whyItWorks: "Heavy strokes, simple counters, and compact letterforms make it forgiving in 3mm acrylic.",
    riskNotes: "Can feel too blocky for very elegant wedding designs.",
    notes: "A sturdy default when production safety matters more than delicate styling.",
    pairingSuggestions: ["Satisfy", "SignPainter Medium", "Segoe Script Bold"],
    manualPriority: true,
  },
  {
    fontName: "Cooper Black",
    score: 94,
    rank: 2,
    recommendedRank: 2,
    category: "top_10",
    type: "serif",
    bestUse: ["Children's toppers", "Retro birthdays", "Chunky names"],
    riskLevel: "low",
    whyItWorks: "Rounded, weighty forms cut strongly while still looking playful.",
    riskNotes: "Large counters need visual checking at very small sizes.",
    notes: "Useful when a topper needs charm without fragile details.",
    pairingSuggestions: ["Quicksand Bold", "Roboto Condensed Bold"],
    manualPriority: true,
  },
  {
    fontName: "Arial Rounded MT Bold",
    score: 93,
    rank: 3,
    recommendedRank: 3,
    category: "top_10",
    type: "sans-serif",
    bestUse: ["Supporting text", "Children's names", "Soft modern toppers"],
    riskLevel: "low",
    whyItWorks: "Bold rounded terminals resist fragile points and keep short phrases readable.",
    riskNotes: "Less distinctive as a main display font.",
    notes: "A safe supporting-text workhorse.",
    pairingSuggestions: ["Bailey Sidney Script", "Sunlight Script Bold", "Sophia"],
    manualPriority: true,
  },
  {
    fontName: "Bebas Neue",
    score: 92,
    rank: 4,
    recommendedRank: 4,
    category: "top_10",
    type: "sans-serif",
    bestUse: ["Tall names", "Numbers", "Modern birthday toppers"],
    riskLevel: "low",
    whyItWorks: "Tall condensed capitals are clean, strong, and easy to weld visually.",
    riskNotes: "Narrow lowercase-style use is limited; best for uppercase or short words.",
    notes: "Excellent for modern vertical impact and number-led designs.",
    pairingSuggestions: ["Satisfy", "Rosalyn Script", "Quince Script"],
    manualPriority: true,
  },
  {
    fontName: "Rockwell Extra Bold",
    score: 91,
    rank: 5,
    recommendedRank: 5,
    category: "top_10",
    type: "serif",
    bestUse: ["Luxury acrylic", "Bold numbers", "Formal supporting text"],
    riskLevel: "low",
    whyItWorks: "Slab serifs provide premium character without sharp fragile hairlines.",
    riskNotes: "Watch tight inner counters if compressed heavily.",
    notes: "A strong serif choice for formal toppers.",
    pairingSuggestions: ["Bickham Script Pro Semibold", "SignPainter Medium"],
    manualPriority: true,
  },
  {
    fontName: "Quicksand Bold",
    score: 90,
    rank: 6,
    recommendedRank: 6,
    category: "top_10",
    type: "sans-serif",
    bestUse: ["Supporting phrases", "Baby shower", "Modern minimal toppers"],
    riskLevel: "low",
    whyItWorks: "Rounded geometry stays readable and avoids brittle terminals.",
    riskNotes: "Use larger sizes for very long phrases.",
    notes: "Pairs well with decorative names without fighting them.",
    pairingSuggestions: ["Bailey Sidney Script", "Satisfy", "Bestie Script"],
    manualPriority: true,
  },
  {
    fontName: "Raleway ExtraBold",
    score: 89,
    rank: 7,
    recommendedRank: 7,
    category: "top_10",
    type: "sans-serif",
    bestUse: ["Modern toppers", "Supporting text", "Clean names"],
    riskLevel: "low",
    whyItWorks: "Crisp but heavy enough for acrylic, with good readability at topper scale.",
    riskNotes: "Avoid thin Raleway weights for cutting.",
    notes: "Use ExtraBold or Black weights for production; avoid Light/Thin.",
    pairingSuggestions: ["Sunlight Script Bold", "Quince Script"],
    manualPriority: true,
  },
  {
    fontName: "Sunlight Script Bold",
    score: 88,
    rank: 8,
    recommendedRank: 8,
    category: "top_10",
    type: "script",
    bestUse: ["Names", "Wedding toppers", "Birthday names"],
    riskLevel: "medium",
    whyItWorks: "A bolder script gives elegance while keeping more usable stroke weight.",
    riskNotes: "Swashes and dots still need operator review before cutting.",
    notes: "A stronger script option than delicate hairline scripts.",
    pairingSuggestions: ["Arial Rounded MT Bold", "Raleway ExtraBold", "Roboto Condensed Bold"],
    manualPriority: true,
  },
  {
    fontName: "Roboto Condensed Bold",
    score: 87,
    rank: 9,
    recommendedRank: 9,
    category: "top_10",
    type: "sans-serif",
    bestUse: ["Supporting text", "Long phrases", "Modern toppers"],
    riskLevel: "low",
    whyItWorks: "Bold condensed forms fit long wording while keeping strokes substantial.",
    riskNotes: "Less decorative, so pair with a script or display main font.",
    notes: "Great for phrases such as Happy Birthday, Christening, or Anniversary.",
    pairingSuggestions: ["Sophia", "Bickham Script Pro Semibold", "Rosalyn Script"],
    manualPriority: true,
  },
  {
    fontName: "Balgon Bold Bold",
    score: 86,
    rank: 10,
    recommendedRank: 10,
    category: "top_10",
    type: "display",
    bestUse: ["Bold names", "Birthday toppers", "Number-led designs"],
    riskLevel: "low",
    whyItWorks: "Strong weight and display personality make it practical without being plain.",
    riskNotes: "Check unusual letter joins after aggressive overlap.",
    notes: "A good repo-local display font for production-friendly toppers.",
    pairingSuggestions: ["Quicksand Bold", "Roboto Condensed Bold"],
    manualPriority: true,
  },
  {
    fontName: "Britannic Bold",
    score: 85,
    rank: 11,
    recommendedRank: 11,
    category: "next_best_10",
    type: "sans-serif",
    bestUse: ["Names", "Short phrases", "Bold birthdays"],
    riskLevel: "low",
    whyItWorks: "Wide, heavy forms are easy to read and resilient.",
    riskNotes: "Style is distinctive and may not suit delicate themes.",
    notes: "A safe second-tier display option.",
    pairingSuggestions: ["Satisfy", "Bailey Sidney Script"],
    manualPriority: true,
  },
  {
    fontName: "Century Gothic Bold",
    score: 84,
    rank: 12,
    recommendedRank: 12,
    category: "next_best_10",
    type: "sans-serif",
    bestUse: ["Modern minimal", "Supporting text", "Baby shower"],
    riskLevel: "low",
    whyItWorks: "Clean round geometry keeps wording calm and readable.",
    riskNotes: "Large round counters need checking if reduced below topper scale.",
    notes: "A polished supporting choice for modern designs.",
    pairingSuggestions: ["Sunlight Script Bold", "Quince Script"],
    manualPriority: true,
  },
  {
    fontName: "Arial Black",
    score: 83,
    rank: 13,
    recommendedRank: 13,
    category: "next_best_10",
    type: "sans-serif",
    bestUse: ["Numbers", "Bold supporting text", "Very small words"],
    riskLevel: "low",
    whyItWorks: "Very heavy strokes survive cutting and remain readable.",
    riskNotes: "Plain look; use when structure matters most.",
    notes: "The production fallback when a phrase must be robust.",
    pairingSuggestions: ["Bestie Script", "Sophia"],
    manualPriority: true,
  },
  {
    fontName: "Bermula Extra Bold",
    score: 82,
    rank: 14,
    recommendedRank: 14,
    category: "next_best_10",
    type: "sans-serif",
    bestUse: ["Modern names", "Supporting phrases", "Birthdays"],
    riskLevel: "low",
    whyItWorks: "The Extra Bold weight keeps the family practical for acrylic.",
    riskNotes: "Avoid Bermula Light for production cuts.",
    notes: "Useful modern alternative to system sans fonts.",
    pairingSuggestions: ["Satisfy", "Sunlight Script Bold"],
    manualPriority: true,
  },
  {
    fontName: "Bookman Old Style Bold",
    score: 81,
    rank: 15,
    recommendedRank: 15,
    category: "next_best_10",
    type: "serif",
    bestUse: ["Luxury toppers", "Anniversary", "Formal words"],
    riskLevel: "medium",
    whyItWorks: "Bold serif forms offer character with better strength than thin formal serifs.",
    riskNotes: "Serif details still need a preview check at small sizes.",
    notes: "A warmer formal serif for premium pieces.",
    pairingSuggestions: ["Bickham Script Pro Semibold", "SignPainter Medium"],
    manualPriority: true,
  },
  {
    fontName: "SignPainter Medium",
    score: 80,
    rank: 16,
    recommendedRank: 16,
    category: "next_best_10",
    type: "script",
    bestUse: ["Names", "Wedding toppers", "Premium birthdays"],
    riskLevel: "medium",
    whyItWorks: "Readable script style with more body than very fine calligraphy fonts.",
    riskNotes: "Check detached dots and swash ends before cutting.",
    notes: "A practical script when paired with a sturdy supporting font.",
    pairingSuggestions: ["Anton", "Rockwell Extra Bold", "Roboto Condensed Bold"],
    manualPriority: true,
  },
  {
    fontName: "Satisfy",
    score: 79,
    rank: 17,
    recommendedRank: 17,
    category: "next_best_10",
    type: "script",
    bestUse: ["Names", "Friendly toppers", "Birthday scripts"],
    riskLevel: "medium",
    whyItWorks: "Friendly connected script with good readability for names.",
    riskNotes: "Use a larger size and inspect joins; not as sturdy as block fonts.",
    notes: "Good for softer personalisation when not over-compressed.",
    pairingSuggestions: ["Anton", "Quicksand Bold", "Bebas Neue"],
    manualPriority: true,
  },
  {
    fontName: "Bailey Sidney Script",
    score: 78,
    rank: 18,
    recommendedRank: 18,
    category: "next_best_10",
    type: "script",
    bestUse: ["Names", "Wedding designs", "Elegant birthday toppers"],
    riskLevel: "medium",
    whyItWorks: "Decorative enough for premium work while still usable for names.",
    riskNotes: "Review thin terminals and detached marks before production.",
    notes: "Best as a main name paired with a clean sans.",
    pairingSuggestions: ["Arial Rounded MT Bold", "Quicksand Bold"],
    manualPriority: true,
  },
  {
    fontName: "Roboto Black",
    score: 77,
    rank: 19,
    recommendedRank: 19,
    category: "next_best_10",
    type: "sans-serif",
    bestUse: ["Numbers", "Supporting text", "Modern toppers"],
    riskLevel: "low",
    whyItWorks: "Plain, heavy, and predictable for cutting.",
    riskNotes: "Best when the main font carries the decorative personality.",
    notes: "A reliable utility font for production.",
    pairingSuggestions: ["Sophia", "Rosalyn Script"],
    manualPriority: true,
  },
  {
    fontName: "Bodoni MT Bold",
    score: 76,
    rank: 20,
    recommendedRank: 20,
    category: "next_best_10",
    type: "serif",
    bestUse: ["Luxury acrylic", "Formal names", "Anniversary"],
    riskLevel: "medium",
    whyItWorks: "Elegant contrast gives a premium look when used large enough.",
    riskNotes: "Thin contrast strokes and serifs are more fragile than slab serifs.",
    notes: "Use cautiously at larger sizes; avoid tiny supporting text.",
    pairingSuggestions: ["Roboto Condensed Bold", "Raleway ExtraBold"],
    manualPriority: true,
  },
  {
    fontName: "Bickham Script Pro Semibold",
    score: 72,
    category: "script",
    type: "script",
    bestUse: ["Wedding names", "Luxury toppers"],
    riskLevel: "medium",
    whyItWorks: "The Semibold weight is more realistic for cutting than lighter calligraphy styles.",
    riskNotes: "Fine calligraphy details need manual inspection.",
    notes: "Use large and pair with a sturdy block font.",
    pairingSuggestions: ["Rockwell Extra Bold", "Roboto Condensed Bold"],
    manualPriority: true,
  },
  {
    fontName: "Edwardian Script ITC",
    score: 52,
    category: "use_with_caution",
    type: "script",
    bestUse: ["Large decorative wedding names only"],
    riskLevel: "high",
    whyItWorks: "Elegant style can suit weddings when enlarged.",
    riskNotes: "Very fine strokes and delicate joins are risky for 3mm acrylic.",
    notes: "Use only with careful LightBurn review and a test cut.",
    pairingSuggestions: ["Arial Black", "Roboto Condensed Bold"],
    manualPriority: true,
  },
  {
    fontName: "Vladimir Script",
    score: 54,
    category: "use_with_caution",
    type: "script",
    bestUse: ["Large single names"],
    riskLevel: "high",
    whyItWorks: "Decorative script style can look elegant.",
    riskNotes: "Thin entry and exit strokes can snap or fail to connect.",
    notes: "Use larger than usual and inspect every join.",
    pairingSuggestions: ["Arial Rounded MT Bold", "Bebas Neue"],
    manualPriority: true,
  },
  {
    fontName: "Wingdings",
    score: 15,
    category: "not_recommended",
    type: "decorative",
    bestUse: ["Symbols only, not text toppers"],
    riskLevel: "high",
    whyItWorks: "Not suitable for readable wording.",
    riskNotes: "Symbol font; text will not render as expected words.",
    notes: "Avoid for cake topper text.",
    pairingSuggestions: [],
    manualPriority: true,
  },
  {
    fontName: "Webdings",
    score: 15,
    category: "not_recommended",
    type: "decorative",
    bestUse: ["Symbols only, not text toppers"],
    riskLevel: "high",
    whyItWorks: "Not suitable for readable wording.",
    riskNotes: "Symbol font; text will not render as expected words.",
    notes: "Avoid for cake topper text.",
    pairingSuggestions: [],
    manualPriority: true,
  },
];

export const FONT_PAIRING_RECOMMENDATIONS: FontPairingRecommendation[] = [
  {
    pairingType: "Elegant wedding topper",
    mainFont: "Sunlight Script Bold",
    supportingFont: "Rockwell Extra Bold",
    bestFor: "Names with formal dates or Mr & Mrs",
    notes: "Script gives the name softness; slab serif keeps small supporting words strong.",
  },
  {
    pairingType: "Children's birthday topper",
    mainFont: "Cooper Black",
    supportingFont: "Quicksand Bold",
    bestFor: "One, Two, First Birthday",
    notes: "Rounded heavy forms feel playful and are forgiving in acrylic.",
  },
  {
    pairingType: "Bold number topper",
    mainFont: "Anton",
    supportingFont: "Roboto Condensed Bold",
    bestFor: "Age numbers with short phrases",
    notes: "Both fonts keep high stroke weight and fit well in compact layouts.",
  },
  {
    pairingType: "Luxury acrylic topper",
    mainFont: "Bodoni MT Bold",
    supportingFont: "Raleway ExtraBold",
    bestFor: "Anniversary and premium names",
    notes: "High-contrast serif brings luxury; bold sans keeps secondary text stable.",
  },
  {
    pairingType: "Modern minimal topper",
    mainFont: "Bebas Neue",
    supportingFont: "Century Gothic Bold",
    bestFor: "Clean birthday and event wording",
    notes: "Tall display type plus geometric support keeps the design tidy.",
  },
  {
    pairingType: "Baby shower topper",
    mainFont: "Bailey Sidney Script",
    supportingFont: "Arial Rounded MT Bold",
    bestFor: "Baby Shower and first names",
    notes: "Soft script pairs with rounded sans for warmth and readability.",
  },
  {
    pairingType: "Anniversary topper",
    mainFont: "SignPainter Medium",
    supportingFont: "Bookman Old Style Bold",
    bestFor: "Names plus dates",
    notes: "Script carries the names while the serif gives the date formal weight.",
  },
  {
    pairingType: "First birthday topper",
    mainFont: "Satisfy",
    supportingFont: "Cooper Black",
    bestFor: "Script name plus chunky age word",
    notes: "Friendly script and rounded bold text feel celebratory without becoming fragile.",
  },
  {
    pairingType: "Script name + block phrase",
    mainFont: "Sophia",
    supportingFont: "Anton",
    bestFor: "Name over Happy Birthday",
    notes: "Decorative name gets contrast from a structurally strong block phrase.",
  },
  {
    pairingType: "Two-line name and age",
    mainFont: "Quince Script",
    supportingFont: "Roboto Black",
    bestFor: "Name plus age or short event word",
    notes: "Keep the script large, then use the bold sans for reliable smaller text.",
  },
];

const manualByName = new Map(
  CAKE_TOPPER_FONT_RECOMMENDATIONS.map((item) => [normaliseFontName(item.fontName), item]),
);

export function normaliseFontName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getManualFontClassification(font: FontInfo): CakeTopperFontClassification | undefined {
  return manualByName.get(normaliseFontName(font.full_name)) ?? manualByName.get(normaliseFontName(font.family));
}

export function classifyFontHeuristically(font: FontInfo): CakeTopperFontClassification {
  const name = normaliseFontName(`${font.full_name} ${font.family} ${font.style}`);
  const isSymbol = /\b(wingdings|webdings|symbol|icons|emoji|assets)\b/.test(name);
  const isScript = /\b(script|signature|brush|hand|calligraphy|cursive|satisfy|bromello|love)\b/.test(name);
  const isSerif = /\b(serif|roman|bodoni|baskerville|bookman|rockwell|georgia|times|antiqua|perpetua|garamond)\b/.test(name);
  const isSans = /\b(sans|arial|roboto|raleway|quicksand|calibri|segoe|verdana|tahoma|century gothic|franklin|bahnschrift|corbel|candara)\b/.test(name);
  const isDecorative = /\b(monogram|ornament|shadow|outline|swash|floral|tattoo|graffiti|distress|sketch|inner|extrude)\b/.test(name);
  const isThin = /\b(thin|light|hairline|line)\b/.test(name);
  const isBold = /\b(bold|black|heavy|extra bold|extrabold|poster)\b/.test(name);

  if (isSymbol) {
    return {
      fontName: font.full_name,
      score: 15,
      category: "not_recommended",
      type: "decorative",
      bestUse: ["Symbols only"],
      riskLevel: "high",
      whyItWorks: "This is a symbol or icon font rather than a text face.",
      riskNotes: "It will not produce readable cake topper wording.",
      notes: "Avoid for topper text.",
    };
  }

  if (isDecorative || isThin) {
    return {
      fontName: font.full_name,
      score: isBold ? 58 : 45,
      category: "use_with_caution",
      type: isScript ? "script" : isSerif ? "serif" : isSans ? "sans-serif" : "decorative",
      bestUse: ["Large decorative accents", "Manual review designs"],
      riskLevel: isBold ? "medium" : "high",
      whyItWorks: "It may have decorative value in the right design.",
      riskNotes: "Decorative, thin, outline, shadow, swash, or monogram details can create fragile cuts.",
      notes: "Use only after preview and LightBurn inspection.",
    };
  }

  if (isScript) {
    return {
      fontName: font.full_name,
      score: isBold ? 72 : 64,
      category: "script",
      type: "script",
      bestUse: ["Names", "Wedding toppers", "Personalised designs"],
      riskLevel: isBold ? "medium" : "medium",
      whyItWorks: "Script faces work well for names when joins are visible and sized generously.",
      riskNotes: "Detached dots, fine entry strokes, and swashes need manual checking.",
      notes: "Use as a main name font with a sturdy supporting font.",
    };
  }

  if (isSerif) {
    return {
      fontName: font.full_name,
      score: isBold ? 74 : 62,
      category: "serif",
      type: "serif",
      bestUse: ["Formal toppers", "Luxury acrylic", "Anniversary text"],
      riskLevel: isBold ? "medium" : "medium",
      whyItWorks: "Serifs can add premium character when stroke weight is sufficient.",
      riskNotes: "Thin serifs and high-contrast strokes can be fragile at small sizes.",
      notes: "Prefer bold weights and avoid tiny text.",
    };
  }

  if (isSans || isBold) {
    return {
      fontName: font.full_name,
      score: isBold ? 76 : 68,
      category: isBold ? "supporting_text" : "sans_serif",
      type: "sans-serif",
      bestUse: ["Supporting text", "Modern toppers", "Readable phrases"],
      riskLevel: "low",
      whyItWorks: "Clean sans-serif forms tend to be readable and structurally predictable.",
      riskNotes: isBold ? "Low risk, but verify counters after heavy overlap." : "Use larger sizes for regular weights.",
      notes: "A practical choice for phrases and secondary lines.",
    };
  }

  return {
    fontName: font.full_name,
    score: 50,
    category: "uncategorised",
    type: "unknown",
    bestUse: ["Manual review"],
    riskLevel: "medium",
    whyItWorks: "This font has not been manually ranked yet.",
    riskNotes: "Inspect stroke thickness, counters, detached dots, and joins before cutting.",
    notes: "Still available in All Fonts A-Z; add a manual override after real cut testing.",
  };
}

export function getFontClassification(font: FontInfo): CakeTopperFontClassification {
  return getManualFontClassification(font) ?? classifyFontHeuristically(font);
}

export function getFontOptionLabel(font: FontInfo): string {
  const classification = getFontClassification(font);
  const badge = FONT_CATEGORY_LABELS[classification.category];
  const score = classification.score >= 60 ? ` - ${classification.score}` : "";
  return classification.category === "uncategorised"
    ? font.full_name
    : `${font.full_name} (${badge}${score})`;
}

export function fontMatchesCategory(font: FontInfo, category: CakeTopperFontCategory | "all"): boolean {
  if (category === "all") return true;
  const classification = getFontClassification(font);
  if (classification.category === category) return true;
  if (category === "script") return classification.type === "script";
  if (category === "serif") return classification.type === "serif";
  if (category === "sans_serif") return classification.type === "sans-serif";
  return false;
}

export function sortFontsForCakeTopper(fonts: FontInfo[]): FontInfo[] {
  return [...fonts].sort((a, b) => {
    const ar = getFontClassification(a);
    const br = getFontClassification(b);
    const aRank = ar.recommendedRank ?? ar.rank ?? 9999;
    const bRank = br.recommendedRank ?? br.rank ?? 9999;
    if (aRank !== bRank) return aRank - bRank;
    if (ar.score !== br.score) return br.score - ar.score;
    return a.full_name.localeCompare(b.full_name);
  });
}

export function getRankedFonts(fonts: FontInfo[], category: "top_10" | "next_best_10"): FontInfo[] {
  return sortFontsForCakeTopper(fonts)
    .filter((font) => getFontClassification(font).category === category)
    .slice(0, 10);
}

export function getFontsByCategory(fonts: FontInfo[], category: CakeTopperFontCategory): FontInfo[] {
  return sortFontsForCakeTopper(fonts).filter((font) => fontMatchesCategory(font, category));
}

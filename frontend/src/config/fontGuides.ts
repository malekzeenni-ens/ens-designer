import type { FontInfo } from "../types/design";

export const GUIDE_GROUPS = [
  { id: "names", title: "Name fonts", description: "Font 1–18 from your two numbered name sheets." },
  { id: "scripts", title: "Acrylic name fonts", description: "Font 1-13 from the acrylic customer chart." },
  { id: "capitals", title: "Capital letters", description: "Four alphabet options, in the original order." },
  { id: "ampersands", title: "Ampersands", description: "Ampersand options have their own numbering." },
  { id: "numbers", title: "Numbers", description: "Seven numeral options, in the original order." },
  { id: "happy", title: "Happy lettering", description: "Option 1-7 from the Happy customer chart." },
] as const;

export type GuideGroup = typeof GUIDE_GROUPS[number]["id"];
export interface FontGuide {
  id: string;
  group: GuideGroup;
  name: string;
  sample: string;
  number?: number;
  aliases?: string[];
  style?: string;
  note?: string;
}

const names: Array<[string, string, string[]?]> = [
  ["Ayshana", "Gina", ["Ayshana Script"]],
  ["Darling", "Suzanna"],
  ["Joseph", "Arthur", ["josephsophia"]],
  ["Home Town", "Daisy"],
  ["Ayalisse", "Myriam"],
  ["Thick Black", "Archie"],
  ["Buttercup Sample", "Sophie"],
  ["Alex Brush", "Hannah"],
  ["Joseph", "joseph & sophia", ["josephsophia"]],
  ["Pacifico", "Sarah"],
  ["Lobster", "Suzanna"],
  ["Anton", "Arthur"],
  ["Back Wild", "DAISY"],
  ["Cheery Note", "Myriam", ["Cheerynote"]],
  ["Sunday Unicorn", "ARCHIE"],
  ["Positive Mindset", "Sophie"],
  ["Snap", "Hannah", ["Snap ITC"]],
  ["Hello Avocado", "Charles"],
];

const scripts: Array<[string, string, string?]> = [
  ["Blusfarmsy", "Myriam"], ["Legendday", "Arthur"], ["Shalfolk", "Suzanna"],
  ["Sweets Delight DEMO", "Emma"], ["Amsterdam", "Daisy"],
  ["Dancing Script", "Sarah", "Bold"], ["Sprinkle Delicious", "Archie"],
  ["Whimsy Wonder", "Hannah"], ["Blisymind", "Sophia"], ["Peanut Butter", "Henry"],
  ["Fraga Script", "Sophie"], ["Pacifico", "Jamie"], ["Satisfy", "Lauren"],
];

export const FONT_GUIDES: FontGuide[] = [
  ...names.map(([name, sample, aliases], i): FontGuide => ({ id: `names-${i + 1}`, group: "names", name, sample, aliases, number: i + 1 })),
  { id: "names-back-to-black", group: "names", name: "Back to Black", sample: "Sarah", aliases: ["Back to Black Bold Demo"], note: "Additional name font; also Happy Option 2." },
  ...scripts.map(([name, sample, style], i): FontGuide => ({ id: `scripts-${i + 1}`, group: "scripts", name, sample, number: i + 1,
    style: style ?? (name === "Sweets Delight DEMO" ? "DEMO" : undefined), aliases: name === "Sweets Delight DEMO" ? ["Sweets Delight"] : undefined })),
  ...["Crimson Pro", "Gabriela", "Sedan", "Arbutus Slab"].map((name, i): FontGuide => ({
    id: `capitals-${i + 1}`, group: "capitals", name, sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", number: i + 1,
  })),
  ...["Arbutus Slab", "Gabriela", "Cookie", "Crimson Pro", "Amita"].map((name, i): FontGuide => ({
    id: `ampersands-${i + 1}`, group: "ampersands", name, sample: "&", number: i + 1,
  })),
  { id: "ampersands-6", group: "ampersands", name: "Unlabelled ampersand", sample: "&", number: 6,
    note: "The source shows a decorative ampersand but gives no font name. Font identification is needed." },
  ...["Josephsophia", "Satisfy", "Besley", "Ayshana", "Sign Painter", "Courgette", "Lobster"].map((name, i): FontGuide => ({
    id: `numbers-${i + 1}`, group: "numbers", name, sample: "1234567890", number: i + 1,
    aliases: name === "Ayshana" ? ["Ayshana Script"] : undefined,
    style: name === "Sign Painter" ? "Medium" : undefined,
  })),
  // Matched against the seven rendered samples in happy-font-chart.jpg.
  ...["Fraga Script", "Back to Black", "Amsterdam", "Pacifico", "Peanut Butter", "Manda Script", "Navisha Script"].map((name, i): FontGuide => ({
    id: `happy-${i + 1}`, group: "happy", name, sample: "Happy", number: i + 1,
    aliases: name === "Back to Black" ? ["Back to Black Bold Demo"] : undefined,
  })),
];

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Exact identities only: a similar family is not a faithful guide preview. */
export function resolveGuideFont(guide: FontGuide, fonts: FontInfo[]): FontInfo | undefined {
  if (guide.id === "ampersands-6") return undefined;
  const names = [guide.name, ...(guide.aliases ?? [])].map(normalise);
  const matches = fonts.filter(font => [font.family, font.full_name, ...(font.aliases ?? [])].some(name => names.includes(normalise(name))));
  const style = normalise(guide.style ?? "Regular");
  return matches.filter(font => normalise(font.style) === style).sort((a, b) =>
    Number(b.source === "project") - Number(a.source === "project") || a.id.localeCompare(b.id),
  )[0];
}

/** Customer numbers stay scoped to their chart, even when one face occurs in several. */
export function guideOptionLabel(guide: FontGuide): string {
  const titles: Record<GuideGroup, string> = { names: "Name", scripts: "Acrylic", capitals: "Capital", ampersands: "Ampersand", numbers: "Number", happy: "Happy" };
  return `${titles[guide.group]} ${guide.group === "names" || guide.group === "scripts" ? "Font" : "Option"}${guide.number ? ` ${guide.number}` : ""}`;
}

const guideLabelCache = new WeakMap<FontInfo, string[]>();
export function fontGuideLabels(font: FontInfo): string[] {
  let labels = guideLabelCache.get(font);
  if (!labels) {
    labels = FONT_GUIDES.filter(guide => resolveGuideFont(guide, [font])).map(guideOptionLabel);
    guideLabelCache.set(font, labels);
  }
  return labels;
}

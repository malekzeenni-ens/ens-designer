import type { FontInfo } from "../types/design";

export function fontDisplayName(font: FontInfo): string {
  const name = font.full_name.trim();
  const style = font.style.trim();
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return !style || /^(regular|normal|roman)$/i.test(style) || normalise(name).endsWith(normalise(style))
    ? name : `${name} ${style}`;
}

export function fontSearchText(font: FontInfo): string {
  return [font.full_name, font.family, font.style, ...(font.aliases ?? [])].join(" ").toLowerCase();
}

/** Interface-only preference. Never part of a design recipe or export. */
export type Appearance = "dark" | "bright";

// Keep in sync with the synchronous first-paint bootstrap in index.html.
export const APPEARANCE_KEY = "ens:designer:appearance";

export function readAppearance(): Appearance {
  try {
    return window.localStorage.getItem(APPEARANCE_KEY) === "bright" ? "bright" : "dark";
  } catch {
    return "dark";
  }
}

export function applyAppearance(appearance: Appearance): void {
  document.documentElement.dataset.theme = appearance;
  document.documentElement.style.colorScheme = appearance === "bright" ? "light" : "dark";
}

export function saveAppearance(appearance: Appearance): void {
  applyAppearance(appearance);
  try {
    window.localStorage.setItem(APPEARANCE_KEY, appearance);
  } catch {
    // A blocked/full store must not prevent changing appearance for this session.
  }
}

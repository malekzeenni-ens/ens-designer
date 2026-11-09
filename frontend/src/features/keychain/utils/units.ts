import type { KeychainDesign, KeychainRequest, Unit } from "../state/keychainTypes";
export const UNIT_MM: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
export const fromMm = (value: number, unit: Unit) => value / UNIT_MM[unit];
export const toMm = (value: number, unit: Unit) => value * UNIT_MM[unit];
export const dimension = (value: number, unit: Unit) => `${fromMm(value, unit).toFixed(unit === "in" ? 3 : 1)} ${unit}`;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function toRequest(design: KeychainDesign): KeychainRequest {
  return { ...design, text: design.text.trim().normalize("NFC") || "Name", quality: "preview", request_id: null };
}

import type { DesignAction } from "./keychainReducer";
import type { KeychainDesign, ProductionCheck, Unit } from "./keychainTypes";
import { dimension } from "../utils/units";

/**
 * Production-check fixes are server suggestions. They are never applied as
 * arbitrary object paths: only these fields, value types and ranges are
 * accepted, and a value equal to the current setting is rejected as a no-op.
 */
export type FixPlan =
  | { kind: "design"; action: DesignAction; label: string }
  | { kind: "filter-fonts"; label: string }
  | { kind: "none"; reason: string };

type NumberField = { type: "number"; range: (design: KeychainDesign) => [number, number]; label: string; physical: boolean };
type BooleanField = { type: "boolean"; label: string };
const SET_FIELDS: Record<string, NumberField | BooleanField> = {
  "backing.offset_mm": { type: "number", range: () => [1, 10], label: "backing offset", physical: true },
  "backing.smoothing_mm": { type: "number", range: () => [0, 3], label: "outline smoothing", physical: true },
  "size.target_mm": { type: "number", range: design => design.size.mode === "width" ? [25, 200] : [10, 100], label: "target size", physical: true },
  "ring.outer_diameter_mm": { type: "number", range: () => [10, 15], label: "ring outer diameter", physical: true },
  "ring.hole_diameter_mm": { type: "number", range: () => [4, 6], label: "ring hole diameter", physical: true },
  "stroke_buffer_mm": { type: "number", range: () => [0, .6], label: "stroke reinforcement", physical: true },
  "dots.auto_join": { type: "boolean", label: "i / j dot joining" },
};
const SNAP_KEYS = new Set(["auto_snap", "x_offset_mm", "y_offset_mm"]);

function read(design: KeychainDesign, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], design);
}
function patchFor(design: KeychainDesign, field: string, value: number | boolean): Partial<KeychainDesign> {
  const [head, tail] = field.split(".");
  if (!tail) return { [head]: value } as Partial<KeychainDesign>;
  const group = design[head as keyof KeychainDesign] as object;
  return { [head]: { ...group, [tail]: value } } as Partial<KeychainDesign>;
}
const unsupported = (check: ProductionCheck) => ({ kind: "none" as const,
  reason: check.fix_note || "No automatic fix is available for this check. Adjust the design manually." });

export function planFix(check: ProductionCheck, design: KeychainDesign, unit: Unit = "mm"): FixPlan {
  if (check.severity === "pass") return { kind: "none", reason: "This check has passed." };
  const fix = check.fix;
  if (!fix) return unsupported(check);
  if (fix.action === "filter_fonts_supporting_text") return { kind: "filter-fonts", label: "Show fonts that support this name" };
  if (fix.action === "set") {
    const spec = fix.field ? SET_FIELDS[fix.field] : undefined;
    if (!spec || !fix.field) return { kind: "none", reason: "This suggestion is not supported by this version of the designer. Adjust the setting manually." };
    if (spec.type === "boolean") {
      if (typeof fix.value !== "boolean") return { kind: "none", reason: "The suggested value is invalid. Adjust the setting manually." };
      if (read(design, fix.field) === fix.value) return { kind: "none", reason: check.fix_note || `The ${spec.label} setting is already applied.` };
      return { kind: "design", action: { type: "patch", value: patchFor(design, fix.field, fix.value) },
        label: `${fix.value ? "Turn on" : "Turn off"} ${spec.label}` };
    }
    const [min, max] = spec.range(design);
    if (typeof fix.value !== "number" || !Number.isFinite(fix.value) || fix.value < min || fix.value > max)
      return { kind: "none", reason: `The suggested ${spec.label} is outside the allowed range. Adjust it manually.` };
    if (Math.abs(Number(read(design, fix.field)) - fix.value) < 1e-9)
      return { kind: "none", reason: check.fix_note || `The ${spec.label} is already at the suggested value.` };
    const shown = spec.physical ? dimension(fix.value, unit) : String(fix.value);
    return { kind: "design", action: { type: "patch", value: patchFor(design, fix.field, fix.value) }, label: `Set ${spec.label} to ${shown}` };
  }
  if (fix.action === "snap_ring") {
    if (!design.ring.enabled) return { kind: "none", reason: "The ring is turned off." };
    const value = (fix.value && typeof fix.value === "object" ? fix.value : { auto_snap: true }) as Record<string, unknown>;
    const ring = { ...design.ring };
    for (const [key, item] of Object.entries(value)) {
      if (!SNAP_KEYS.has(key)) return { kind: "none", reason: "This ring suggestion is not supported. Move the ring manually." };
      if (key === "auto_snap") { if (typeof item !== "boolean") return unsupported(check); ring.auto_snap = item; }
      else {
        if (typeof item !== "number" || !Number.isFinite(item) || Math.abs(item) > 100) return unsupported(check);
        ring[key as "x_offset_mm" | "y_offset_mm"] = item;
      }
    }
    if (JSON.stringify(ring) === JSON.stringify(design.ring))
      return { kind: "none", reason: check.fix_note || "The ring is already snapped at its preset position." };
    const reset = ring.x_offset_mm !== design.ring.x_offset_mm || ring.y_offset_mm !== design.ring.y_offset_mm;
    return { kind: "design", action: { type: "patch", value: { ring } }, label: reset ? "Return ring to its preset and snap" : "Snap ring to backing" };
  }
  return { kind: "none", reason: "This suggestion is not supported by this version of the designer. Adjust the design manually." };
}

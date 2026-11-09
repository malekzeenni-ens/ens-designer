import { describe, expect, it } from "vitest";
import { planFix } from "../state/checkFixes";
import { DEFAULT_DESIGN, type ProductionCheck } from "../state/keychainTypes";
import { designReducer } from "../state/keychainReducer";

const design = { ...DEFAULT_DESIGN, text: "Sarah", font_id: "anton" };
const failing = (fix: ProductionCheck["fix"], note: string | null = null): ProductionCheck =>
  ({ id: "KC-X", severity: "warning", message: "Problem", fix, highlight_bbox_mm: null, fix_note: note });

describe("production-check fix planning", () => {
  it("applies an allowlisted nested field without touching sibling settings", () => {
    const plan = planFix(failing({ action: "set", field: "backing.offset_mm", value: 4.5 }), design);
    expect(plan.kind).toBe("design");
    if (plan.kind !== "design") return;
    const next = designReducer(design, plan.action);
    expect(next.backing).toEqual({ ...design.backing, offset_mm: 4.5 });
    expect(plan.label).toBe("Set backing offset to 4.5 mm");
  });
  it("shows physical values in the selected unit", () => {
    const plan = planFix(failing({ action: "set", field: "size.target_mm", value: 63.5 }), design, "in");
    expect(plan.kind === "design" && plan.label).toBe("Set target size to 2.500 in");
  });
  it.each([
    [{ action: "set", field: "recipe.app_version", value: "x" }, "not supported"],
    [{ action: "set", field: "backing.offset_mm", value: 50 }, "outside the allowed range"],
    [{ action: "set", field: "backing.offset_mm", value: "4" }, "outside the allowed range"],
    [{ action: "set", field: "dots.auto_join", value: "yes" }, "invalid"],
    [{ action: "delete_everything" }, "not supported"],
    [{ action: "snap_ring", value: { position: "custom" } }, "not supported"],
  ])("rejects unsafe or unknown fix %j", (fix, reason) => {
    const plan = planFix(failing(fix as ProductionCheck["fix"]), design);
    expect(plan.kind).toBe("none");
    expect(plan.kind === "none" && plan.reason).toContain(reason);
  });
  it("treats a value equal to the current setting as an explained no-op", () => {
    const plan = planFix(failing({ action: "set", field: "backing.offset_mm", value: 3 }, "Increase spacing instead."), design);
    expect(plan).toEqual({ kind: "none", reason: "Increase spacing instead." });
    expect(planFix(failing({ action: "snap_ring", value: { auto_snap: true, x_offset_mm: 0, y_offset_mm: 0 } }), design).kind).toBe("none");
  });
  it("re-snaps and resets a moved ring as one patch", () => {
    const moved = { ...design, ring: { ...design.ring, x_offset_mm: 6, auto_snap: false } };
    const plan = planFix(failing({ action: "snap_ring", value: { auto_snap: true, x_offset_mm: 0, y_offset_mm: 0 } }), moved);
    expect(plan.kind === "design" && plan.label).toBe("Return ring to its preset and snap");
    if (plan.kind === "design") expect(designReducer(moved, plan.action).ring).toEqual(design.ring);
  });
  it("explains checks without an automatic fix and never offers one for passes", () => {
    expect(planFix(failing(null, "Reset large letter offsets."), design)).toEqual({ kind: "none", reason: "Reset large letter offsets." });
    expect(planFix({ ...failing({ action: "set", field: "backing.offset_mm", value: 4 }), severity: "pass" }, design).kind).toBe("none");
    expect(planFix(failing({ action: "filter_fonts_supporting_text" }), design).kind).toBe("filter-fonts");
  });
});

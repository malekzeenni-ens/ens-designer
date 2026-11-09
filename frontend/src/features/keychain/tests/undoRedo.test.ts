import { expect, it } from "vitest";
import { DEFAULT_DESIGN } from "../state/keychainTypes";
import { designReducer, type DesignAction } from "../state/keychainReducer";
import { timeline, timelineReducer, type DesignTimeline } from "../state/useUndoRedo";
const edit = (state: DesignTimeline, action: DesignAction, at: number, group?: string) => timelineReducer(state, { type: "edit", action, at, group });

it("coalesces typing until a pause and restores the complete recipe with redo", () => {
  let state = timeline(DEFAULT_DESIGN);
  state = edit(state, { type: "name", value: "S" }, 0, "name");
  state = edit(state, { type: "name", value: "Sa" }, 100, "name");
  expect(state.past).toHaveLength(1);
  state = edit(state, { type: "name", value: "Sarah" }, 300, "name");
  expect(state.past).toHaveLength(2);
  const undo = timelineReducer(state, { type: "undo" });
  expect(undo.present.text).toBe("Sa");
  expect(timelineReducer(undo, { type: "redo" }).present).toEqual(state.present);
});
it("drops the redo branch after a new edit", () => {
  let state = edit(timeline(DEFAULT_DESIGN), { type: "name", value: "Sarah" }, 1);
  state = timelineReducer(state, { type: "undo" });
  state = edit(state, { type: "name", value: "Jo" }, 2);
  expect(state.future).toEqual([]); expect(timelineReducer(state, { type: "redo" }).present.text).toBe("Jo");
});
it("retains exactly the latest 100 undo steps", () => {
  let state = timeline(DEFAULT_DESIGN);
  for (let i = 0; i < 105; i++) state = edit(state, { type: "name", value: `Name${i}` }, i*1000);
  expect(state.past).toHaveLength(100);
  for (let i = 0; i < 100; i++) state = timelineReducer(state, { type: "undo" });
  expect(state.present.text).toBe("Name4"); expect(state.past).toHaveLength(0); expect(state.future).toHaveLength(100);
});
it("keeps two slider gestures separate even when they occur within 400 ms", () => {
  let state = edit(timeline(DEFAULT_DESIGN), { type: "patch", value: { stroke_buffer_mm: .1 } }, 0, "stroke");
  state = edit(state, { type: "patch", value: { stroke_buffer_mm: .2 } }, 50, "stroke");
  state = timelineReducer(state, { type: "boundary" });
  state = edit(state, { type: "patch", value: { stroke_buffer_mm: .3 } }, 100, "stroke");
  expect(state.past).toHaveLength(2);
  expect(timelineReducer(state, { type: "undo" }).present.stroke_buffer_mm).toBe(.2);
});
it("does not record no-op changes and keeps initial font hydration out of undo", () => {
  let state = edit(timeline(DEFAULT_DESIGN), { type: "name", value: "Sarah" }, 0);
  state = timelineReducer(state, { type: "fonts", fallback: "anton", available: ["anton"] });
  expect(state.past).toHaveLength(1); expect(state.present.font_id).toBe("anton");
  state = edit(state, { type: "patch", value: {} }, 1);
  expect(state.past).toHaveLength(1);
  const undo = timelineReducer(state, { type: "undo" }); expect(undo.present.font_id).toBe("anton"); expect(undo.present.text).toBe("");
});
it("accumulates same-frame nudges and bounds physical ring and letter offsets", () => {
  let design = designReducer(DEFAULT_DESIGN, { type: "move", selection: 0, dx: .1, dy: 0 });
  design = designReducer(design, { type: "move", selection: 0, dx: .1, dy: 0 });
  expect(design.glyph_transforms[0].dx_mm).toBeCloseTo(.2);
  design = designReducer(design, { type: "move", selection: 0, dx: 200, dy: -200 });
  expect(design.glyph_transforms[0].dx_mm).toBe(50); expect(design.glyph_transforms[0].dy_mm).toBe(-50);
  design = designReducer(design, { type: "move", selection: "ring", dx: 200, dy: -200 });
  expect(design.ring.x_offset_mm).toBe(100); expect(design.ring.y_offset_mm).toBe(-100);
});
it("letter reset clears only that letter's transform and dot offset", () => {
  const design = { ...DEFAULT_DESIGN, glyph_transforms: [{ glyph_index: 0, dx_mm: 2, dy_mm: 0, scale: 1.5, rotation_deg: 30 }, { glyph_index: 1, dx_mm: 1, dy_mm: 0, scale: 1, rotation_deg: 0 }],
    dots: { ...DEFAULT_DESIGN.dots, manual_offsets: [{ glyph_index: 0, x_offset_mm: 1, y_offset_mm: -1 }] } };
  const next = designReducer(design, { type: "reset-glyph", index: 0 });
  expect(next.glyph_transforms).toEqual([design.glyph_transforms[1]]); expect(next.dots.manual_offsets).toEqual([]);
});

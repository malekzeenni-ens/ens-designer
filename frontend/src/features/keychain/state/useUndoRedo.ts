import { useCallback, useReducer } from "react";
import { designReducer, type DesignAction } from "./keychainReducer";
import type { KeychainDesign } from "./keychainTypes";

export interface DesignTimeline { present: KeychainDesign; past: KeychainDesign[]; future: KeychainDesign[]; group: string | null; at: number }
type TimelineAction = { type: "edit"; action: DesignAction; group?: string; at: number }
  | { type: "undo" | "redo" }
  | { type: "boundary" }
  | { type: "fonts"; fallback: string; available: string[] };
export const timeline = (present: KeychainDesign): DesignTimeline => ({ present, past: [], future: [], group: null, at: 0 });
export function timelineReducer(state: DesignTimeline, event: TimelineAction): DesignTimeline {
  if (event.type === "boundary") return { ...state, group: null, at: 0 };
  if (event.type === "undo") return state.past.length ? {
    present: state.past.at(-1)!, past: state.past.slice(0, -1), future: [state.present, ...state.future].slice(0, 100), group: null, at: 0,
  } : state;
  if (event.type === "redo") return state.future.length ? {
    present: state.future[0], past: [...state.past, state.present].slice(-100), future: state.future.slice(1), group: null, at: 0,
  } : state;
  if (event.type === "fonts") {
    const ensure = (design: KeychainDesign) => event.available.includes(design.font_id) ? design : {
      ...design, font_id: event.fallback, glyph_transforms: [], gap_configs: [], dots: { ...design.dots, manual_offsets: [] },
    };
    return { ...state, present: ensure(state.present), past: state.past.map(ensure), future: state.future.map(ensure) };
  }
  if (event.type !== "edit") return state;
  const next = designReducer(state.present, event.action);
  if (JSON.stringify(next) === JSON.stringify(state.present)) return state;
  const coalesced = event.group && event.group === state.group && !state.future.length
    && event.at-state.at <= (event.group === "name" ? 150 : 400);
  return { present: next, past: coalesced ? state.past : [...state.past, state.present].slice(-100), future: [], group: event.group ?? null, at: event.at };
}
export function useUndoRedo(initial: KeychainDesign) {
  const [history, send] = useReducer(timelineReducer, initial, timeline);
  const edit = useCallback((action: DesignAction, group?: string) => send({ type: "edit", action, group, at: Date.now() }), []);
  const undo = useCallback(() => send({ type: "undo" }), []);
  const redo = useCallback(() => send({ type: "redo" }), []);
  const ensureFonts = useCallback((fallback: string, available: string[]) => send({ type: "fonts", fallback, available }), []);
  const boundary = useCallback(() => send({ type: "boundary" }), []);
  return { design: history.present, edit, undo, redo, ensureFonts, boundary, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useKeychainPreview } from "../hooks/useKeychainPreview";
import { previewKeychain } from "../services/keychainApi";
import type { KeychainRequest, KeychainResult } from "../state/keychainTypes";
import { request, result } from "./fixtures";
vi.mock("../services/keychainApi", () => ({ previewKeychain: vi.fn() }));
let root: Root, container: HTMLDivElement;
let output: ReturnType<typeof useKeychainPreview>;
const pending: { payload: KeychainRequest; signal: AbortSignal; resolve: (result: KeychainResult) => void; reject: (error: Error) => void }[] = [];
function Harness({ text, active = true }: { text: string; active?: boolean }) { output = useKeychainPreview(request(text), 150, active); return null; }
beforeEach(() => {
  vi.useFakeTimers(); pending.length = 0;
  vi.mocked(previewKeychain).mockImplementation((payload, signal) => new Promise((resolve, reject) => pending.push({ payload, signal, resolve, reject })));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
const render = (text: string, active = true) => act(async () => root.render(<Harness text={text} active={active} />));
const tick = () => act(async () => vi.advanceTimersByTimeAsync(150));
it("debounces rapid typing and ignores an aborted response even if it resolves later", async () => {
  await render("S"); await render("Sa"); await render("Sarah"); await tick();
  expect(pending).toHaveLength(1); expect(pending[0].payload.text).toBe("Sarah");
  await render("Jo"); expect(pending[0].signal.aborted).toBe(true); await tick();
  await act(async () => pending[0].resolve(result(pending[0].payload)));
  expect(output.result).toBeNull();
  await act(async () => pending[1].resolve(result(pending[1].payload)));
  expect(output.result?.recipe.text).toBe("Jo"); expect(output.current).toBe(true);
});
it("keeps the last good design visible on errors and marks it stale", async () => {
  await render("Sarah"); await tick(); await act(async () => pending[0].resolve(result(pending[0].payload)));
  await render("Jo"); await tick(); await act(async () => pending[1].reject(new Error("Font unavailable")));
  expect(output.result?.recipe.text).toBe("Sarah"); expect(output.error).toBe("Font unavailable"); expect(output.current).toBe(false);
});
it("rejects an incorrect response ID and cancels pending work when hidden", async () => {
  await render("Sarah"); await tick(); await act(async () => pending[0].resolve(result({ ...pending[0].payload, request_id: -1 })));
  expect(output.result).toBeNull();
  await render("Jo", false); expect(pending[0].signal.aborted).toBe(true); await tick(); expect(pending).toHaveLength(1);
});

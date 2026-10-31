import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APPEARANCE_KEY, applyAppearance, readAppearance, saveAppearance } from "./appearance";

describe("Designer appearance persistence", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("restores a saved Bright preference and rejects an invalid value", () => {
    window.localStorage.setItem(APPEARANCE_KEY, "bright");
    expect(readAppearance()).toBe("bright");
    window.localStorage.setItem(APPEARANCE_KEY, "invalid");
    expect(readAppearance()).toBe("dark");
  });

  it("changes the current session even when persistence is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage blocked"); });
    expect(() => saveAppearance("bright")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("bright");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("uses a safe default when reading storage fails", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage blocked"); });
    expect(readAppearance()).toBe("dark");
  });

  it("persists and reapplies an explicit selection", () => {
    saveAppearance("bright");
    applyAppearance("dark");
    applyAppearance(readAppearance());
    expect(document.documentElement.dataset.theme).toBe("bright");
    expect(window.localStorage.getItem(APPEARANCE_KEY)).toBe("bright");
  });
});

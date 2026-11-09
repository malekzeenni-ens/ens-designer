import { downloadBlob } from "../../../services/download";
import type { KeychainHistoryEntry, KeychainRequest, KeychainResult } from "../state/keychainTypes";

async function read<T>(response: Response): Promise<T> {
  if (response.ok) return response.json();
  let message = "Could not reach the Keychain service. Start or restart the local backend and retry.";
  try {
    const error = await response.json();
    if (typeof error.detail === "string") message = error.detail;
    else if (Array.isArray(error.detail)) message = error.detail.map((item: { loc?: string[]; msg?: string }) => `${item.loc?.at(-1) ?? "Setting"}: ${item.msg ?? "Invalid value"}`).join(" · ");
  } catch { /* An old backend may return HTML instead of an API error. */ }
  throw new Error(message);
}
async function generate(path: string, request: KeychainRequest, signal?: AbortSignal) {
  const response = await fetch(`/api/keychain/${path}`, { method: "POST", signal,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  return read<KeychainResult>(response);
}
export const previewKeychain = (request: KeychainRequest, signal: AbortSignal) => generate("preview", request, signal);
export const exportKeychain = (request: KeychainRequest) => generate("export", request);
export async function fetchKeychainHistory(signal?: AbortSignal): Promise<KeychainHistoryEntry[]> {
  return read(await fetch("/api/keychain/history", { signal }));
}
// R1 F12: one shared download helper for the Designer and the Keychain.
export { downloadBlob };
export function downloadPng(result: KeychainResult) {
  if (!result.png_base64) throw new Error("The export did not include a PNG. Retry the export.");
  const data = Uint8Array.from(atob(result.png_base64), char => char.charCodeAt(0));
  const stem = result.files[0]?.filename.replace(/(-backing|-text)?\.svg$/, "") ?? "keychain";
  downloadBlob(new Blob([data], { type: "image/png" }), `${stem}.png`);
}

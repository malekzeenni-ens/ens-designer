/**
 * Shared browser download helper (R1 F12).
 *
 * The anchor is attached to the document before clicking (some browsers
 * ignore clicks on detached anchors) and object URLs are revoked only after
 * the browser has had time to start the download.
 */
export const REVOKE_DELAY_MS = 1000;

export function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}

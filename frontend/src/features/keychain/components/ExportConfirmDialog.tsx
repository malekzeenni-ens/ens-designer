import { useEffect, useRef, type KeyboardEvent } from "react";
import type { ProductionCheck } from "../state/keychainTypes";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Modal confirmation for exports with production errors. Focus starts on
 * Cancel, Tab/Shift+Tab stay inside, Escape cancels, and focus returns to the
 * control that opened it. The workspace behind it is made inert by the caller.
 */
export function ExportConfirmDialog({ name, errors, held, onCancel, onConfirm, returnFocus }: {
  name: string; errors: ProductionCheck[]; held: boolean;
  onCancel: () => void; onConfirm: () => void; returnFocus?: () => HTMLElement | null;
}) {
  const dialog = useRef<HTMLElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const restore = useRef<{ opener: Element | null; fallback?: () => HTMLElement | null }>({ opener: null });
  useEffect(() => {
    restore.current = { opener: document.activeElement, fallback: returnFocus };
    cancel.current?.focus();
    return () => {
      const { opener, fallback } = restore.current;
      // Defer until the caller has removed `inert` from the workspace; a
      // disabled or removed opener falls back to the caller's target.
      setTimeout(() => {
        const usable = opener instanceof HTMLElement && opener.isConnected && !opener.closest("[inert]")
          && !(opener as HTMLButtonElement).disabled;
        (usable ? opener as HTMLElement : fallback?.())?.focus();
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function keydown(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); return; }
    if (event.key !== "Tab" || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0], last = items[items.length-1];
    if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
  return <div className="kc-dialog-backdrop" onKeyDown={keydown}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="kc-export-warning" aria-describedby="kc-export-warning-text" className="kc-dialog">
      <h2 id="kc-export-warning">{held ? "Export returned production errors" : "Export with production errors?"}</h2>
      <p id="kc-export-warning-text">{held
        ? `The export of ${name} returned errors that need review. Nothing has been downloaded. The recipe was already saved to Keychain history by the export.`
        : `${name} has unresolved production errors. Review them before cutting.`}</p>
      <ul>{errors.map(check => <li key={check.id}>{check.message}</li>)}</ul>
      <div><button type="button" ref={cancel} onClick={onCancel}>Cancel</button>
        <button type="button" className="kc-primary" onClick={onConfirm}>{held ? "Download anyway" : "Export anyway"}</button></div>
    </section>
  </div>;
}

import { CircleCheck, Crosshair, LoaderCircle, TriangleAlert, Wrench } from "lucide-react";
import { planFix } from "../state/checkFixes";
import type { KeychainDesign, KeychainResult, ProductionCheck, Unit } from "../state/keychainTypes";

export interface FixStatus { checkId: string; state: "pending" | "resolved" | "remaining" | "failed"; message: string }

const severityLabel = (check: ProductionCheck) => check.severity === "pass" ? "Passed" : check.severity === "error" ? "Error" : check.severity === "warning" ? "Warning" : "Note";

export function ProductionCheckPanel({ result, stale = false, design, unit = "mm", highlighted = null, fixStatus = null, onFix, onShow }: {
  result: KeychainResult | null; stale?: boolean; design?: KeychainDesign; unit?: Unit;
  highlighted?: string | null; fixStatus?: FixStatus | null;
  onFix?: (check: ProductionCheck) => void; onShow?: (check: ProductionCheck) => void;
}) {
  const errors = result?.checks.filter(check => check.severity === "error") ?? [];
  const warnings = result?.checks.filter(check => check.severity === "warning") ?? [];
  const passed = result?.checks.filter(check => check.severity === "pass") ?? [];
  const pending = fixStatus?.state === "pending";
  // Failures first, so the actionable items are visible without scrolling.
  const ordered = result ? [...errors, ...warnings, ...result.checks.filter(check => check.severity === "info"), ...passed] : [];
  return <section className="kc-checks-wrap" aria-label="Production check">
    {fixStatus && <p className={`kc-fix-status kc-fix-${fixStatus.state}`} role="status">
      {pending && <LoaderCircle className="kc-spin" size={14} />}{fixStatus.message}</p>}
    <details className={`kc-checks${errors.length ? " kc-checks-error" : ""}${stale ? " kc-checks-stale" : ""}`}>
      <summary><span>{errors.length || warnings.length ? <TriangleAlert size={17} /> : <CircleCheck size={17} />} Production check</span>
        <span>{stale && result ? "Updating · previous result: " : ""}{errors.length} errors · {warnings.length} warnings · {passed.length} passed</span></summary>
      {stale && result && <p className="kc-checks-note">These results belong to the previous preview. Fixes are available again once the preview is current.</p>}
      <ul>{result ? ordered.map(check => {
        const plan = design && check.severity !== "pass" ? planFix(check, design, unit) : null;
        const box = check.severity !== "pass" ? check.highlight_bbox_mm : null;
        return <li key={check.id} className={`kc-check-${check.severity}${highlighted === check.id ? " kc-check-highlighted" : ""}`}>
          <strong>{severityLabel(check)}</strong>
          <div className="kc-check-body"><span>{check.message}</span>
            {plan?.kind === "none" && <small className="kc-check-reason">{plan.reason}</small>}
            {plan && plan.kind !== "none" && check.fix_note && <small className="kc-check-reason">{check.fix_note}</small>}
            {(box || (plan && plan.kind !== "none")) && <div className="kc-check-actions">
              {box && onShow && <button type="button" aria-pressed={highlighted === check.id} onClick={() => onShow(check)}
                aria-label={`${highlighted === check.id ? "Hide" : "Show"} ${check.id} on canvas`}><Crosshair size={14} />{highlighted === check.id ? "Hide" : "Show"}</button>}
              {plan && plan.kind !== "none" && onFix && <button type="button" className="kc-fix-button" disabled={stale || pending}
                onClick={() => onFix(check)} title={stale ? "Wait for the current preview" : undefined}><Wrench size={14} />{plan.label}</button>}
            </div>}
          </div>
        </li>;
      }) : <li>Checks will appear with your preview.</li>}</ul>
    </details>
  </section>;
}

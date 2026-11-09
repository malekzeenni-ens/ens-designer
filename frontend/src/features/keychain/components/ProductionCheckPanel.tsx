import { CircleCheck, TriangleAlert } from "lucide-react";
import type { KeychainResult } from "../state/keychainTypes";
export function ProductionCheckPanel({ result }: { result: KeychainResult | null }) {
  const errors = result?.checks.filter(check => check.severity === "error") ?? [];
  const warnings = result?.checks.filter(check => check.severity === "warning") ?? [];
  const passed = result?.checks.filter(check => check.severity === "pass") ?? [];
  return <details className={`kc-checks${errors.length ? " kc-checks-error" : ""}`}>
    <summary><span>{errors.length || warnings.length ? <TriangleAlert size={17} /> : <CircleCheck size={17} />} Production check</span>
      <span>{errors.length} errors · {warnings.length} warnings · {passed.length} passed</span></summary>
    <ul>{result ? result.checks.map(check => <li key={check.id} className={`kc-check-${check.severity}`}><strong>{check.severity === "pass" ? "Passed" : check.severity}</strong><span>{check.message}</span></li>) : <li>Checks will appear with your preview.</li>}</ul>
  </details>;
}

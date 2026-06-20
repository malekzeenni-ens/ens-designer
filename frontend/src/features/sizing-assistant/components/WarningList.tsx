import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

import type { SizingWarning } from "../engine/sizingTypes";

interface WarningListProps {
  warnings: SizingWarning[];
}

export function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) {
    return <p className="sa-empty-note">No sizing warnings.</p>;
  }

  return (
    <ul className="sa-warning-list">
      {warnings.map((warning) => (
        <li key={warning.code} className={`sa-warning sa-warning--${warning.severity}`}>
          {warning.severity === "critical" ? (
            <OctagonAlert size={17} aria-hidden="true" />
          ) : warning.severity === "warning" ? (
            <AlertTriangle size={17} aria-hidden="true" />
          ) : (
            <Info size={17} aria-hidden="true" />
          )}
          <span>
            <strong>{warning.message}</strong>
            {warning.suggestedAction && <small>{warning.suggestedAction}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}

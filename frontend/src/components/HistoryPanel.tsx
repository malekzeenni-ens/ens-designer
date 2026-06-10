import { useEffect, useState } from "react";
import { fetchHistory } from "../services/generationApi";
import type { HistoryEntry } from "../types/design";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchHistory()
      .then((data) => setEntries(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="ct-panel">
      <div className="ct-card">
        <div className="ct-section-heading" style={{ padding: "14px 14px 0" }}>
          <div>
            <h2>Export History</h2>
            <p>
              Every time you click Download SVG or Download PNG, the design is recorded here so you can
              see what was made and when.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div style={{ padding: "14px" }}>
          {error && <p className="error">{error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className="ct-muted">No exports yet. Download an SVG or PNG from the Designer tab to start building history.</p>
          )}

          {entries.length > 0 && (
            <div className="ct-history-table-wrap">
              <table className="ct-history-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Type</th>
                    <th>Text</th>
                    <th>Font (per line)</th>
                    <th>Size (per line)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i}>
                      <td className="ct-history-timestamp">{formatTimestamp(entry.timestamp)}</td>
                      <td>
                        <span className={`ct-history-badge ct-history-badge--${entry.export_type}`}>
                          {entry.export_type.toUpperCase()}
                        </span>
                      </td>
                      <td>{entry.full_text}</td>
                      <td>
                        {entry.lines.map((line, li) => (
                          <div key={li}>
                            Line {li + 1}: {line.font_name || "—"}
                          </div>
                        ))}
                      </td>
                      <td>
                        {entry.lines.map((line, li) => (
                          <div key={li}>
                            Line {li + 1}: {line.font_size_mm}mm
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

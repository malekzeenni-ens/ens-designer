import { useEffect, useState } from "react";
import { Clock3, RefreshCw, X } from "lucide-react";
import { fetchKeychainHistory } from "../services/keychainApi";
import type { KeychainHistoryEntry, Unit } from "../state/keychainTypes";
import { dimension } from "../utils/units";

export function KeychainHistoryList({ active, version, unit, onLoad, onClose }: {
  active: boolean; version: number; unit: Unit; onLoad: (entry: KeychainHistoryEntry) => void; onClose: () => void;
}) {
  const [entries, setEntries] = useState<KeychainHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetchKeychainHistory(controller.signal).then(response => { if (!controller.signal.aborted) setEntries(response); })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load history."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [active, version, retry]);
  return <section className="kc-history" aria-label="Keychain history"><header><h2><Clock3 size={17} />Recent keychains</h2>
    <div><button type="button" aria-label="Refresh Keychain history" onClick={() => setRetry(value => value+1)}><RefreshCw size={15} /></button><button type="button" aria-label="Close Keychain history" onClick={onClose}><X size={16} /></button></div></header>
    {loading && <p role="status">Loading saved designs…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value+1)}>Retry history</button></p>}
    {!loading && !error && !entries.length && <p>Export your first keychain to save its recipe here.</p>}
    <div className="kc-history-list">{entries.map((entry, index) => {
      const date = new Date(entry.timestamp);
      const saved = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" }).format(date) : "Saved design";
      return <button type="button" key={`${entry.timestamp}-${index}`} onClick={() => onLoad(entry)} aria-label={`Load ${entry.recipe.text} from history`}>
        <span><strong>{entry.recipe.text}</strong><small>{entry.recipe.style === "layered" ? "Layered" : "Engraved"} · {dimension(entry.width_mm, unit)} × {dimension(entry.height_mm, unit)}</small></span>
        <span><small>{saved}</small><span className="kc-history-load">Load recipe →</span></span>
      </button>;
    })}</div>
  </section>;
}

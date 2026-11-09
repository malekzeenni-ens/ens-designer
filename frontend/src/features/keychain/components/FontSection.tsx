import { useEffect, useMemo, useRef, useState } from "react";
import { FontPicker } from "../../../components/FontPicker";
import { getFontClassification } from "../../../config/cakeTopperFontRecommendations";
import { fetchFontCharacters } from "../../../services/generationApi";
import type { FontInfo } from "../../../types/design";
import { Toggle } from "./Fields";

const characterCache = new Map<string, Promise<Set<number>>>();
function fontCharacters(id: string) {
  if (!characterCache.has(id)) characterCache.set(id, fetchFontCharacters(id).then(response => new Set(response.characters.map(char => char.codepoint))).catch(error => { characterCache.delete(id); throw error; }));
  return characterCache.get(id)!;
}
export function suitability(font: FontInfo): "Recommended" | "OK" | "Caution" | null {
  const data = getFontClassification(font);
  if (data.type === "unknown" || data.category === "uncategorised") return null;
  if (data.riskLevel === "high" || ["use_with_caution", "not_recommended"].includes(data.category)) return "Caution";
  return data.score >= 75 && data.riskLevel === "low" ? "Recommended" : "OK";
}
export function preferredFont(fonts: FontInfo[], manual: FontInfo[]) {
  return manual.find(font => suitability(font) === "Recommended") ?? manual[0] ?? fonts[0];
}
export function matchesFontStyle(font: FontInfo, filter: string) {
  const type = getFontClassification(font).type;
  return filter === "all" || type === filter || filter === "display" && (type === "decorative" || /bold|black|heavy/i.test(`${font.style} ${font.full_name}`));
}

export function FontSection({ fonts, manualFonts, value, text, onChange, onPreview, supportRequest = 0 }: {
  fonts: FontInfo[]; manualFonts: FontInfo[]; value: string; text: string;
  onChange: (id: string) => void; onPreview: (id: string | null) => void;
  /** Incremented by the KC-MISSING-GLYPHS fix to open the support filter. */
  supportRequest?: number;
}) {
  const [filter, setFilter] = useState("all");
  const [supportOnly, setSupportOnly] = useState(false);
  const supportToggle = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!supportRequest) return;
    setSupportOnly(true);
    const input = supportToggle.current;
    const section = input?.closest("details");
    if (section) section.open = true;
    input?.scrollIntoView?.({ block: "center" }); input?.focus();
  }, [supportRequest]);
  const [supported, setSupported] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const candidates = useMemo(() => fonts.filter(font => matchesFontStyle(font, filter)), [fonts, filter]);
  useEffect(() => {
    if (!supportOnly) return;
    let cancelled = false;
    const found = new Set<string>();
    const characters = [...(text.trim().normalize("NFC") || "Name")].map(char => char.codePointAt(0)!);
    let cursor = 0, done = 0, failed = 0;
    setSupported(new Set()); setProgress({ done: 0, total: candidates.length, failed: 0 });
    async function worker() {
      while (!cancelled && cursor < candidates.length) {
        const font = candidates[cursor++];
        try { const codes = await fontCharacters(font.id); if (characters.every(code => codes.has(code))) found.add(font.id); }
        catch { failed++; }
        done++;
        if (!cancelled) { setSupported(new Set(found)); setProgress({ done, total: candidates.length, failed }); }
      }
    }
    void Promise.all(Array.from({ length: Math.min(6, candidates.length) }, worker));
    return () => { cancelled = true; };
  }, [supportOnly, candidates, text]);
  const selected = fonts.find(font => font.id === value);
  const visible = candidates.filter(font => !supportOnly || supported.has(font.id));
  const manualIds = new Set(manualFonts.map(font => font.id));
  const groups = [{ label: "Manual Fonts", fonts: manualFonts.filter(font => visible.some(item => item.id === font.id)) },
    { label: "Font library", fonts: visible.filter(font => !manualIds.has(font.id)) }];
  return <>
    <label className="kc-field">Font style<select value={filter} onChange={event => setFilter(event.target.value)}>
      <option value="all">All styles</option><option value="script">Script</option><option value="display">Bold / Display</option>
      <option value="serif">Serif</option><option value="sans-serif">Sans</option></select></label>
    <FontPicker groups={groups} value={value} selectedFont={selected} onChange={onChange} onPreview={onPreview} previewText={text.trim() || "Name"} label="Keychain font" disabled={!fonts.length} />
    {selected && suitability(selected) && <p className="kc-font-badge">{suitability(selected)} <span>· Font Adviser</span></p>}
    <Toggle label="Fonts that support this name" checked={supportOnly} onChange={setSupportOnly} inputRef={supportToggle} />
    {supportOnly && progress && <small role="status">Checked {progress.done}/{progress.total} fonts · {supported.size} matches{progress.failed > 0 ? ` · ${progress.failed} unavailable` : ""}</small>}
    {supportOnly && progress?.failed ? <button type="button" onClick={() => { setSupportOnly(false); setTimeout(() => setSupportOnly(true), 0); }}>Retry unavailable fonts</button> : null}
  </>;
}

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { FontInfo } from "../types/design";
import { FONT_GUIDES, GUIDE_GROUPS, resolveGuideFont, type GuideGroup } from "../config/fontGuides";
import { FontNamePreview } from "./FontNamePreview";
import "./FontPicker.css";
import "./FontGuidesPanel.css";

export function FontGuidesPanel({ fonts }: { fonts: FontInfo[] }) {
  const [group, setGroup] = useState<GuideGroup>("names");
  const [query, setQuery] = useState("");
  const [sample, setSample] = useState("");
  const [availability, setAvailability] = useState("all");
  const resolved = useMemo(() => FONT_GUIDES.map(guide => ({ guide, font: resolveGuideFont(guide, fonts) })), [fonts]);
  const current = GUIDE_GROUPS.find(item => item.id === group)!;
  const entries = resolved.filter(({ guide, font }) => guide.group === group
    && (availability === "all" || (availability === "installed" ? !!font : !font))
    && `${guide.name} ${guide.aliases?.join(" ") ?? ""} ${guide.sample} ${guide.number ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const installed = resolved.filter(entry => entry.font).length;

  return <div className="font-guides">
    <header className="font-guides-heading">
      <div><span className="font-guides-eyebrow">THE REFERENCE LIBRARY</span><h1>Font guides</h1>
        <p>Your customer font numbers, alphabets and lettering references in one place.</p></div>
      <div className="font-guides-count"><strong>{installed}<span> / {FONT_GUIDES.length}</span></strong><span>references matched to installed fonts</span></div>
    </header>
    <nav className="font-guides-groups" aria-label="Font guide categories">
      {GUIDE_GROUPS.map(item => <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>
        {item.title}<span>{FONT_GUIDES.filter(guide => guide.group === item.id).length}</span>
      </button>)}
    </nav>
    <section className="font-guides-content" aria-labelledby="font-guide-title">
      <div className="font-guides-section-heading"><div><h2 id="font-guide-title">{current.title}</h2><p>{current.description}</p></div></div>
      <div className="font-guides-controls">
        <label><span>Find a reference</span><div className="font-guides-search"><Search size={17} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Font name, sample or number" /></div></label>
        <label><span>Try your own text</span><input value={sample} maxLength={80} onChange={event => setSample(event.target.value)} placeholder="Leave blank for the original sample" /></label>
        <label><span>Show</span><select value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">All references</option><option value="installed">Installed fonts</option><option value="missing">Needs a font</option></select></label>
      </div>
      <p className="font-guides-note">Numbers belong to each guide, not the full font catalogue. Previews use installed font files; hearts, swashes and alternate glyphs in the original artwork may need to be selected separately. Missing fonts are never substituted.</p>
      <div className="font-guides-grid">
        {entries.map(({ guide, font }) => <article className="font-guide-card" key={guide.id}>
          <div className="font-guide-card-top"><span className="font-guide-number">{guide.number ? `${group === "names" || group === "scripts" ? "Font" : "Option"} ${guide.number}` : "Reference"}</span>
            <span className={`font-guide-status${font ? "" : " font-guide-status--missing"}`}>{font ? "Installed" : guide.id === "ampersands-6" ? "Unidentified" : "Not installed"}</span></div>
          <div className={`font-guide-specimen font-guide-specimen--${group}`}>
            {font ? <FontNamePreview font={font} text={sample || guide.sample} /> : <div className="font-guide-unavailable"><strong>{guide.name}</strong><span>{guide.id === "ampersands-6" ? "Font name not supplied" : "Install this font to see its lettering"}</span></div>}
          </div>
          <div className="font-guide-caption"><h3>{guide.name}{guide.style && <span> · {guide.style}</span>}</h3>
            {font && <p>{font.family} · {font.style}</p>}
            {guide.note && <p>{guide.note}</p>}
            {!font && guide.id !== "ampersands-6" && <p>Add the matching font file in Fonts, then return here.</p>}
          </div>
        </article>)}
      </div>
      {!entries.length && <p className="font-guides-empty" role="status">No references match these filters. Try another name, category or availability.</p>}
      <p className="font-guides-footnote" role="status">{entries.length} references shown · Reference only; your current design stays unchanged.</p>
    </section>
  </div>;
}

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import type { FontInfo } from "../types/design";
import { FONT_CATEGORY_LABELS, getFontClassification } from "../config/cakeTopperFontRecommendations";
import { fontDisplayName, fontSearchText } from "../utils/fontIdentity";
import { FontNamePreview } from "./FontNamePreview";
import "./FontPicker.css";

export type FontGroup = { label: string; fonts: FontInfo[] };
interface Props {
  groups: FontGroup[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  selectedFont?: FontInfo;
  disabled?: boolean;
  previewText?: string;
  onPreview?: (id: string | null) => void;
}

export function FontPicker({ groups, value, onChange, label, selectedFont, disabled, previewText, onPreview }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(value);
  const [position, setPosition] = useState({ left: 8, top: 8, width: 320, maxHeight: 400 });
  const filtered = useMemo(() => groups.map((group) => ({ ...group, fonts: group.fonts.filter((font) => fontSearchText(font).includes(query.trim().toLowerCase())) })).filter((group) => group.fonts.length), [groups, query]);
  const fonts = filtered.flatMap((group) => group.fonts);
  const selected = selectedFont ?? groups.flatMap((group) => group.fonts).find((font) => font.id === value);
  const active = fonts.find((font) => font.id === activeId) ?? fonts[0];
  const optionId = (fontId: string) => `${id}-option-${fontId}`;

  function close(restore = false) { setOpen(false); onPreview?.(null); if (restore) trigger.current?.focus(); }
  function choose(fontId: string) { onChange(fontId); close(true); }

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 340), window.innerWidth - 16);
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const maxHeight = Math.min(440, Math.max(below, above, 150));
      const top = below >= Math.min(340, maxHeight) ? rect.bottom + 5 : Math.max(8, rect.top - maxHeight - 5);
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top, width, maxHeight: Math.min(maxHeight, window.innerHeight - top - 8) });
    }
    place(); input.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    };
    const onScroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) place(); };
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("pointerdown", dismiss); window.removeEventListener("resize", place); window.removeEventListener("scroll", onScroll, true); };
  }, [open]);

  useEffect(() => {
    if (open && active) document.getElementById(optionId(active.id))?.scrollIntoView?.({ block: "nearest" });
  }, [open, active?.id]);

  useEffect(() => {
    if (open) onPreview?.(active?.id ?? null);
  }, [open, active?.id, onPreview]);
  useEffect(() => () => onPreview?.(null), [onPreview]);

  return <div className="font-picker">
    <button ref={trigger} type="button" className="font-picker-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-popup` : undefined} disabled={disabled}
      onClick={() => {
        // R1 F7: toggling closed goes through close() so the hover preview ends.
        if (open) { close(); return; }
        setQuery(""); setActiveId(value); setOpen(true);
      }}
      onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setQuery(""); setActiveId(value); setOpen(true); } }}>
      {selected ? <FontNamePreview key={selected.id} font={selected} /> : <span>No fonts available</span>}<ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={popup} id={`${id}-popup`} className="font-picker-popup" role="dialog" aria-label={`Choose ${label.toLowerCase()}`} style={position}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
        if (event.key === "Tab") close(true);
      }}>
      <div className="font-picker-search"><input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setActiveId(""); }} placeholder="Search name or style…" aria-label={`Search ${label.toLowerCase()}`} role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={active ? optionId(active.id) : undefined}
        onKeyDown={(event) => {
          const index = fonts.findIndex((font) => font.id === active?.id);
          let next = index;
          if (event.key === "ArrowDown") next = Math.min(index + 1, fonts.length - 1);
          else if (event.key === "ArrowUp") next = Math.max(index - 1, 0);
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = fonts.length - 1;
          else if (event.key === "Enter" && active) { event.preventDefault(); choose(active.id); return; }
          else return;
          event.preventDefault(); if (fonts[next]) setActiveId(fonts[next].id);
        }} />
        <span role="status">{fonts.length} fonts</span>
      </div>
      <div id={`${id}-list`} role="listbox" aria-label={label} className="font-picker-list">
        {filtered.map((group, groupIndex) => <div key={group.label} role="group" aria-labelledby={`${id}-group-${groupIndex}`}>
          <div className="font-picker-group" id={`${id}-group-${groupIndex}`}>{group.label}</div>
          {group.fonts.map((font) => {
            const classification = getFontClassification(font);
            return <div key={font.id} id={optionId(font.id)} role="option" aria-selected={font.id === value} aria-label={`${fontDisplayName(font)}, ${font.style}, ${FONT_CATEGORY_LABELS[classification.category]}, score ${classification.score}`} className={`font-picker-option${font.id === active?.id ? " is-active" : ""}`} onPointerMove={() => setActiveId(font.id)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(font.id)}>
              <FontNamePreview font={font} text={previewText} />
              {previewText && <span className="font-picker-detail">{fontDisplayName(font)}</span>}
              <div className="font-picker-detail"><span>{font.style} · {FONT_CATEGORY_LABELS[classification.category]} · {classification.score}</span>{font.id === value && <Check size={16} aria-hidden="true" />}</div>
            </div>;
          })}
        </div>)}
        {!fonts.length && <p className="font-picker-empty">No fonts match your search.</p>}
      </div>
    </div>, document.body)}
  </div>;
}

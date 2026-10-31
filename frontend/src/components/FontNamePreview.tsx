import { useEffect, useRef, useState } from "react";
import type { FontInfo } from "../types/design";
import { fontDisplayName } from "../utils/fontIdentity";

type Entry = { face: FontFace; promise: Promise<FontFace>; users: number };
const cache = new Map<string, Entry>();
const CACHE_LIMIT = 96;

function trimCache() {
  for (const [id, entry] of cache) {
    if (cache.size <= CACHE_LIMIT) break;
    if (entry.users === 0) { document.fonts.delete(entry.face); cache.delete(id); }
  }
}

function acquire(id: string) {
  let entry = cache.get(id);
  if (!entry) {
    const face = new FontFace(`ens-font-${id}`, `url(/api/fonts/${encodeURIComponent(id)}/file)`);
    entry = { face, users: 0, promise: face.load() };
    cache.set(id, entry);
    const current = entry;
    entry.promise = entry.promise.then((loaded) => {
      if (cache.get(id) === current) document.fonts.add(loaded);
      return loaded;
    });
  }
  cache.delete(id); cache.set(id, entry);
  entry.users++;
  const current = entry;
  return { promise: entry.promise, release: () => { current.users--; trimCache(); } };
}

export function FontNamePreview({ font }: { font: FontInfo }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    setStatus("loading");
    let cancelled = false;
    let lease: ReturnType<typeof acquire> | undefined;
    const load = () => {
      if (lease || cancelled) return;
      if (typeof FontFace === "undefined" || !document.fonts) { setStatus("failed"); return; }
      try {
        setStatus("loading");
        lease = acquire(font.id);
        lease.promise.then(() => { if (!cancelled) setStatus("ready"); }, () => { if (!cancelled) setStatus("failed"); });
      } catch { setStatus("failed"); }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) load();
      else { lease?.release(); lease = undefined; }
    }, { root: ref.current?.closest("[role=listbox]") ?? null, rootMargin: "80px" });
    if (observer && ref.current) observer.observe(ref.current); else load();
    return () => { cancelled = true; observer?.disconnect(); lease?.release(); };
  }, [font.id]);
  return <span className="font-name-preview-wrap" ref={ref}>
    <span className="font-name-preview" style={status === "ready" ? { fontFamily: `"ens-font-${font.id}"`, fontSynthesis: "none" } : undefined}>{fontDisplayName(font)}</span>
    {status === "failed" && <span className="font-preview-status">Preview unavailable</span>}
  </span>;
}

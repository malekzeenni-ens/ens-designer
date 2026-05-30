import { Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ExportControls } from "./components/ExportControls";
import { FontSelector } from "./components/FontSelector";
import { PreviewPanel } from "./components/PreviewPanel";
import { TextInput } from "./components/TextInput";
import { fetchFonts, generateDesign } from "./services/generationApi";
import type { FontInfo, GenerateResponse } from "./types/design";

export function App() {
  const [text, setText] = useState("Oliver");
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [fontId, setFontId] = useState("");
  const [fontSearch, setFontSearch] = useState("");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFonts()
      .then((loadedFonts) => {
        setFonts(loadedFonts);
        setFontId(loadedFonts[0]?.id ?? "");
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase();
    if (!query) {
      return fonts;
    }
    return fonts.filter((font) => `${font.full_name} ${font.family} ${font.style}`.toLowerCase().includes(query));
  }, [fonts, fontSearch]);
  const selectedFont = useMemo(() => fonts.find((font) => font.id === fontId), [fonts, fontId]);

  useEffect(() => {
    if (filteredFonts.length > 0 && !filteredFonts.some((font) => font.id === fontId)) {
      setFontId(filteredFonts[0].id);
    }
  }, [filteredFonts, fontId]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      setResult(await generateDesign(text, fontId));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not generate design.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header>
          <p>Etch N Shine</p>
          <h1>Core Text Generation</h1>
        </header>

        <div className="controls">
          <TextInput value={text} onChange={setText} />
          <FontSelector
            fonts={filteredFonts}
            value={fontId}
            onChange={setFontId}
            search={fontSearch}
            onSearchChange={setFontSearch}
          />
          <button className="generate-button" type="button" onClick={handleGenerate} disabled={loading || !fontId || filteredFonts.length === 0}>
            <Wand2 size={18} aria-hidden="true" />
            {loading ? "Generating" : "Generate"}
          </button>
        </div>

        {selectedFont && <p className="font-note">Selected: {selectedFont.full_name}</p>}
        {error && <p className="error">{error}</p>}

        <PreviewPanel svg={result?.svg ?? null} />

        <div className="footer-bar">
          <div>
            <span>SVG-first export</span>
            <strong>{result ? `${result.geometry.dimensions.width}mm x ${result.geometry.dimensions.height}mm` : "Ready"}</strong>
          </div>
          <ExportControls
            svg={result?.svg ?? null}
            pngBase64={result?.png_base64 ?? null}
            svgFilename={result?.svg_filename ?? "design.svg"}
            pngFilename={result?.png_filename ?? "design.png"}
          />
        </div>
      </section>
    </main>
  );
}

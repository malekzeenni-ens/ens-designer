import { Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ExportControls } from "./components/ExportControls";
import { FontSelector } from "./components/FontSelector";
import { MaterialSelector } from "./components/MaterialSelector";
import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { OverlapPanel } from "./components/OverlapPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { TextInput } from "./components/TextInput";
import { ValidationPanel } from "./components/ValidationPanel";
import { fetchFonts, fetchMaterials, fetchPresets, generateDesign } from "./services/generationApi";
import type { BridgeOverride, FontInfo, GenerateResponse, MaterialProfile, Preset } from "./types/design";

type Tab = "generator" | "overlap" | "cake-topper";

export function App() {
  const [tab, setTab] = useState<Tab>("generator");

  // Shared font catalogue
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [materials, setMaterials] = useState<MaterialProfile[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);

  // Text Generator state
  const [text, setText] = useState("Oliver");
  const [fontId, setFontId] = useState("");
  const [fontSearch, setFontSearch] = useState("");
  const [materialId, setMaterialId] = useState("cast-acrylic-3mm");
  const [presetId, setPresetId] = useState("");
  const [bridgeOverrides, setBridgeOverrides] = useState<BridgeOverride[]>([]);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchFonts(), fetchMaterials(), fetchPresets()])
      .then(([loadedFonts, loadedMaterials, loadedPresets]) => {
        setFonts(loadedFonts);
        setMaterials(loadedMaterials);
        setPresets(loadedPresets);
        setFontId(loadedFonts[0]?.id ?? "");
        setMaterialId(loadedMaterials[0]?.material_id ?? "cast-acrylic-3mm");
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);

  function handlePresetChange(id: string) {
    setPresetId(id);
    const preset = presets.find((p) => p.preset_id === id);
    if (preset) setMaterialId(preset.default_material_id);
  }

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase();
    if (!query) return fonts;
    return fonts.filter((font) =>
      `${font.full_name} ${font.family} ${font.style}`.toLowerCase().includes(query)
    );
  }, [fonts, fontSearch]);

  const selectedFont = useMemo(
    () => fonts.find((font) => font.id === fontId),
    [fonts, fontId]
  );

  useEffect(() => {
    if (filteredFonts.length > 0 && !filteredFonts.some((f) => f.id === fontId)) {
      setFontId(filteredFonts[0].id);
    }
  }, [filteredFonts, fontId]);

  function handleBridgeOverride(override: BridgeOverride) {
    const updated = [
      ...bridgeOverrides.filter((o) => o.pair_index !== override.pair_index),
      override,
    ];
    setBridgeOverrides(updated);
    setLoading(true);
    setError(null);
    generateDesign(text, fontId, materialId, updated)
      .then(setResult)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not apply bridge override.")
      )
      .finally(() => setLoading(false));
  }

  async function handleGenerate() {
    setBridgeOverrides([]);
    setLoading(true);
    setError(null);
    try {
      setResult(await generateDesign(text, fontId, materialId, []));
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
          <h1>AI SVG Generator</h1>
        </header>

        {/* Tab bar */}
        <div className="tab-bar" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "generator"}
            className={`tab-btn${tab === "generator" ? " tab-btn--active" : ""}`}
            onClick={() => setTab("generator")}
          >
            Text Generator
          </button>
          <button
            role="tab"
            aria-selected={tab === "overlap"}
            className={`tab-btn${tab === "overlap" ? " tab-btn--active" : ""}`}
            onClick={() => setTab("overlap")}
          >
            Overlap Engine
          </button>
          <button
            role="tab"
            aria-selected={tab === "cake-topper"}
            className={`tab-btn${tab === "cake-topper" ? " tab-btn--active" : ""}`}
            onClick={() => setTab("cake-topper")}
          >
            Cake Topper
          </button>
        </div>

        {/* ── Text Generator ─────────────────────────────────── */}
        {tab === "generator" && (
          <>
            {presets.length > 0 && (
              <div className="preset-bar">
                <span className="preset-label">Preset</span>
                <div className="preset-buttons">
                  {presets.map((preset) => (
                    <button
                      key={preset.preset_id}
                      type="button"
                      className={`preset-btn${presetId === preset.preset_id ? " preset-btn--active" : ""}`}
                      title={preset.description}
                      onClick={() => handlePresetChange(preset.preset_id)}
                    >
                      {preset.preset_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="controls">
              <TextInput value={text} onChange={setText} />
              <FontSelector
                fonts={filteredFonts}
                value={fontId}
                onChange={setFontId}
                search={fontSearch}
                onSearchChange={setFontSearch}
              />
              <MaterialSelector materials={materials} value={materialId} onChange={setMaterialId} />
              <button
                className="generate-button"
                type="button"
                onClick={handleGenerate}
                disabled={loading || !fontId || !materialId || filteredFonts.length === 0}
              >
                <Wand2 size={18} aria-hidden="true" />
                {loading ? "Generating" : "Generate"}
              </button>
            </div>

            {selectedFont && <p className="font-note">Selected: {selectedFont.full_name}</p>}
            {error && <p className="error">{error}</p>}

            <PreviewPanel svg={result?.svg ?? null} />
            <ValidationPanel result={result} onBridgeOverride={handleBridgeOverride} />

            <div className="footer-bar">
              <div>
                <span>SVG-first export</span>
                <strong>
                  {result
                    ? `${result.geometry.dimensions.width}mm x ${result.geometry.dimensions.height}mm`
                    : "Ready"}
                </strong>
              </div>
              <ExportControls
                svg={result?.svg ?? null}
                pngBase64={result?.png_base64 ?? null}
                svgFilename={result?.svg_filename ?? "design.svg"}
                pngFilename={result?.png_filename ?? "design.png"}
              />
            </div>
          </>
        )}

        {/* ── Overlap Engine ─────────────────────────────────── */}
        {tab === "overlap" && <OverlapPanel fonts={fonts} />}

        {/* ── Cake Topper ────────────────────────────────────── */}
        {tab === "cake-topper" && <CakeTopperPanel fonts={fonts} />}
      </section>
    </main>
  );
}

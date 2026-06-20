import { useCallback, useEffect, useState } from "react";

import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { ConfigurationPanel } from "./components/ConfigurationPanel";
import { FontAdvisorPanel } from "./components/FontAdvisorPanel";
import { FontsPanel } from "./components/FontsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SizingAssistantTab } from "./features/sizing-assistant/components/SizingAssistantTab";
import { fetchFonts, fetchManualFonts, fetchUploadedFonts, saveManualFonts } from "./services/generationApi";
import type { FontInfo } from "./types/design";

type WorkspaceTab = "designer" | "sizingAssistant" | "advisor" | "fonts" | "configuration" | "history";

export function App() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [uploadedFonts, setUploadedFonts] = useState<FontInfo[]>([]);
  const [manualFonts, setManualFonts] = useState<FontInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("designer");

  const reloadFonts = useCallback(async () => {
    try {
      const all = await fetchFonts();
      const [uploaded, manual] = await Promise.all([fetchUploadedFonts(), fetchManualFonts()]);
      setFonts(all);
      setUploadedFonts(uploaded);
      setManualFonts(manual);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not load fonts.");
    }
  }, []);

  const updateManualFonts = useCallback(async (fontIds: string[]) => {
    const manual = await saveManualFonts(fontIds);
    setManualFonts(manual);
  }, []);

  useEffect(() => {
    reloadFonts();
  }, [reloadFonts]);

  return (
    <main className="app-shell">
      <section className="workspace">
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <nav className="workspace-tabs" aria-label="Workspace">
              <button
                type="button"
                className={activeTab === "designer" ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab("designer")}
              >
                Designer
              </button>
              <button
                type="button"
                className={activeTab === "sizingAssistant" ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab("sizingAssistant")}
              >
                Sizing Assistant
              </button>
              <button
                type="button"
                className={activeTab === "advisor" ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab("advisor")}
              >
                Font Advisor
              </button>
              <button
                type="button"
                className={activeTab === "fonts" ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab("fonts")}
              >
                Fonts
              </button>
              <button
                type="button"
                className={activeTab === "configuration" ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab("configuration")}
              >
                Configuration
              </button>
              <button
                type="button"
                className={activeTab === "history" ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab("history")}
              >
                History
              </button>
            </nav>
            {activeTab === "designer" && <CakeTopperPanel fonts={fonts} manualFonts={manualFonts} />}
            {activeTab === "sizingAssistant" && <SizingAssistantTab />}
            {activeTab === "advisor" && (
              <FontAdvisorPanel fonts={fonts} uploadedFonts={uploadedFonts} />
            )}
            {activeTab === "fonts" && (
              <FontsPanel uploadedFonts={uploadedFonts} onUploadComplete={reloadFonts} />
            )}
            {activeTab === "configuration" && (
              <ConfigurationPanel
                fonts={fonts}
                manualFonts={manualFonts}
                onManualFontsChange={updateManualFonts}
              />
            )}
            {activeTab === "history" && <HistoryPanel />}
          </>
        )}
      </section>
    </main>
  );
}

import { useCallback, useEffect, useState } from "react";

import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { FontAdvisorPanel } from "./components/FontAdvisorPanel";
import { FontsPanel } from "./components/FontsPanel";
import { fetchFonts, fetchUploadedFonts } from "./services/generationApi";
import type { FontInfo } from "./types/design";

type WorkspaceTab = "designer" | "advisor" | "fonts";

export function App() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [uploadedFonts, setUploadedFonts] = useState<FontInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("designer");

  const reloadFonts = useCallback(async () => {
    try {
      const [all, uploaded] = await Promise.all([fetchFonts(), fetchUploadedFonts()]);
      setFonts(all);
      setUploadedFonts(uploaded);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not load fonts.");
    }
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
            </nav>
            {activeTab === "designer" && <CakeTopperPanel fonts={fonts} />}
            {activeTab === "advisor" && (
              <FontAdvisorPanel fonts={fonts} uploadedFonts={uploadedFonts} />
            )}
            {activeTab === "fonts" && (
              <FontsPanel uploadedFonts={uploadedFonts} onUploadComplete={reloadFonts} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

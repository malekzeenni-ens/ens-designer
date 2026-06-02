import { useEffect, useState } from "react";

import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { FontAdvisorPanel } from "./components/FontAdvisorPanel";
import { fetchFonts } from "./services/generationApi";
import type { FontInfo } from "./types/design";

type WorkspaceTab = "designer" | "advisor";

export function App() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("designer");

  useEffect(() => {
    fetchFonts()
      .then(setFonts)
      .catch((caught: Error) => setError(caught.message));
  }, []);

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
            </nav>
            {activeTab === "designer" ? (
              <CakeTopperPanel fonts={fonts} />
            ) : (
              <FontAdvisorPanel fonts={fonts} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

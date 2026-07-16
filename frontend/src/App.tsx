import {
  BadgeCheck,
  Clock3,
  PenTool,
  Ruler,
  Settings2,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { ConfigurationPanel } from "./components/ConfigurationPanel";
import { FontAdvisorPanel } from "./components/FontAdvisorPanel";
import { FontsPanel } from "./components/FontsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SizingAssistantTab } from "./features/sizing-assistant/components/SizingAssistantTab";
import { deleteFonts, fetchFonts, fetchManualFonts, fetchUploadedFonts, saveManualFonts } from "./services/generationApi";
import type { FontInfo } from "./types/design";

type WorkspaceTab = "designer" | "sizingAssistant" | "advisor" | "fonts" | "configuration" | "history";

const WORKSPACES = [
  { id: "designer", label: "Designer", icon: PenTool },
  { id: "sizingAssistant", label: "Sizing", fullLabel: "Sizing Assistant", icon: Ruler },
  { id: "advisor", label: "Advisor", fullLabel: "Font Advisor", icon: BadgeCheck },
  { id: "fonts", label: "Fonts", icon: Type },
  { id: "configuration", label: "Settings", fullLabel: "Configuration", icon: Settings2 },
  { id: "history", label: "History", icon: Clock3 },
] satisfies Array<{
  id: WorkspaceTab;
  label: string;
  fullLabel?: string;
  icon: typeof PenTool;
}>;

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

  const removeFonts = useCallback(async (fontIds: string[]) => {
    await deleteFonts(fontIds);
    await reloadFonts();
  }, [reloadFonts]);

  useEffect(() => {
    reloadFonts();
  }, [reloadFonts]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <img
            className="app-brand-logo"
            src="/brand/etch-n-shine-logo.png"
            alt=""
            aria-hidden="true"
          />
          <div className="app-brand-copy">
            <span>Etch N Shine</span>
            <strong>Designer</strong>
          </div>
        </div>
        <div className="app-context" aria-live="polite">
          <span>Workspace</span>
          <strong>
            {WORKSPACES.find((workspace) => workspace.id === activeTab)?.fullLabel
              ?? WORKSPACES.find((workspace) => workspace.id === activeTab)?.label}
          </strong>
        </div>
        <div className="app-local-status" title="This application is running locally">
          <span aria-hidden="true" />
          Local workspace
        </div>
      </header>

      <div className="app-body">
        <nav className="workspace-tabs" aria-label="Workspace">
          {WORKSPACES.map((workspace) => {
            const Icon = workspace.icon;
            const accessibleLabel = workspace.fullLabel ?? workspace.label;

            return (
              <button
                key={workspace.id}
                type="button"
                className={activeTab === workspace.id ? "workspace-tab workspace-tab--active" : "workspace-tab"}
                onClick={() => setActiveTab(workspace.id)}
                aria-current={activeTab === workspace.id ? "page" : undefined}
                title={accessibleLabel}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{workspace.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="workspace">
        {error ? (
          <div className="error">
            <p>{error}</p>
            <button type="button" onClick={() => { setError(null); reloadFonts(); }}>
              Retry
            </button>
          </div>
        ) : (
          <>
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
                onDeleteFonts={removeFonts}
              />
            )}
            {activeTab === "history" && <HistoryPanel />}
          </>
        )}
        </section>
      </div>
    </main>
  );
}

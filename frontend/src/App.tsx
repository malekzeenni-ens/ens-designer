import {
  BadgeCheck,
  Clock3,
  PenTool,
  Ruler,
  Settings2,
  Type,
} from "lucide-react";
import { Activity, useCallback, useEffect, useState } from "react";

import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { AppearanceSwitch } from "./components/AppearanceSwitch";
import { readAppearance, saveAppearance, type Appearance } from "./appearance";
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
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [uploadedFonts, setUploadedFonts] = useState<FontInfo[]>([]);
  const [manualFonts, setManualFonts] = useState<FontInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("designer");
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);

  const changeAppearance = useCallback((next: Appearance) => {
    saveAppearance(next);
    setAppearance(next);
  }, []);

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
    <main className={activeTab === "designer" ? "app-shell app-shell--designer" : "app-shell"}>
      <header className={activeTab === "designer" ? "app-header app-header--designer" : "app-header"}>
        <div className="app-brand">
          <img
            className="app-brand-logo"
            src="/brand/etch-n-shine-logo.png"
            alt=""
            aria-hidden="true"
          />
          <div className="app-brand-copy">
            <span>Etch N Shine</span>
            <strong>EnS Designer</strong>
          </div>
        </div>
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
                aria-label={accessibleLabel}
                title={accessibleLabel}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{workspace.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="app-design-tools" ref={setToolbarHost} hidden={activeTab !== "designer"} />
        <div className="app-header-utilities">
          <AppearanceSwitch appearance={appearance} onChange={changeAppearance} />

        </div>
      </header>

      <div className="app-body">


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
            <Activity mode={activeTab === "designer" ? "visible" : "hidden"}><CakeTopperPanel fonts={fonts} manualFonts={manualFonts} toolbarHost={toolbarHost} active={activeTab === "designer"} /></Activity>
            {activeTab === "sizingAssistant" && <SizingAssistantTab />}
            {activeTab === "advisor" && (
              <FontAdvisorPanel fonts={fonts} uploadedFonts={uploadedFonts} />
            )}
            {activeTab === "fonts" && (
              <FontsPanel uploadedFonts={uploadedFonts} onUploadComplete={reloadFonts} />
            )}
            {activeTab === "configuration" && (
              <div className="configuration-workspace">
                <section className="appearance-settings" aria-labelledby="appearance-settings-title">
                  <div><h2 id="appearance-settings-title">Appearance</h2><p>Choose Dark or Bright. Your choice is remembered on this browser.</p></div>
                  <AppearanceSwitch appearance={appearance} onChange={changeAppearance} />
                </section>
              <ConfigurationPanel
                fonts={fonts}
                manualFonts={manualFonts}
                onManualFontsChange={updateManualFonts}
                onDeleteFonts={removeFonts}
              />
              </div>
            )}
            {activeTab === "history" && <HistoryPanel />}
          </>
        )}
        </section>
      </div>
    </main>
  );
}

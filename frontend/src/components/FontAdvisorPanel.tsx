import { useState } from "react";
import { AlertTriangle, BadgeCheck, ChevronDown, ChevronRight, Layers, Search } from "lucide-react";

import {
  CAKE_TOPPER_FONT_RECOMMENDATIONS,
  FONT_CATEGORY_LABELS,
  FONT_PAIRING_RECOMMENDATIONS,
  FONT_TYPE_LABELS,
  getFontClassification,
  getFontsByCategory,
  getRankedFonts,
} from "../config/cakeTopperFontRecommendations";
import type { CakeTopperFontCategory } from "../config/cakeTopperFontRecommendations";
import type { FontInfo } from "../types/design";

interface FontAdvisorPanelProps {
  fonts: FontInfo[];
  uploadedFonts: FontInfo[];
}

function Accordion({
  title,
  badge,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`fa-accordion${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="fa-accordion-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="fa-accordion-title">{title}</span>
        {badge != null && <span className="fa-accordion-badge">{badge}</span>}
        {open ? (
          <ChevronDown size={17} aria-hidden="true" />
        ) : (
          <ChevronRight size={17} aria-hidden="true" />
        )}
      </button>
      {open && <div className="fa-accordion-body">{children}</div>}
    </section>
  );
}

function FontTable({ fonts }: { fonts: FontInfo[] }) {
  return (
    <div className="font-table-wrap">
      <table className="font-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Font Name</th>
            <th>Type</th>
            <th>Score</th>
            <th>Best Use</th>
            <th>Why It Works</th>
            <th>Risk Notes</th>
          </tr>
        </thead>
        <tbody>
          {fonts.map((font, index) => {
            const classification = getFontClassification(font);
            return (
              <tr key={font.id}>
                <td>{classification.rank ?? index + 1}</td>
                <td>{font.full_name}</td>
                <td>{FONT_TYPE_LABELS[classification.type]}</td>
                <td>{classification.score}</td>
                <td>{classification.bestUse.join(", ")}</td>
                <td>{classification.whyItWorks}</td>
                <td>{classification.riskNotes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CategorySection({
  title,
  category,
  fonts,
}: {
  title: string;
  category: CakeTopperFontCategory;
  fonts: FontInfo[];
}) {
  const all = getFontsByCategory(fonts, category);
  return (
    <div className="fa-category-col">
      <p className="fa-category-label">
        {title} <span>{all.length}</span>
      </p>
      <div className="font-pill-list">
        {all.slice(0, 12).map((font) => {
          const classification = getFontClassification(font);
          return (
            <span key={font.id} className={`font-pill font-pill--${classification.riskLevel}`}>
              {font.full_name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function FontAdvisorPanel({ fonts, uploadedFonts }: FontAdvisorPanelProps) {
  const topFonts = getRankedFonts(fonts, "top_10");
  const nextFonts = getRankedFonts(fonts, "next_best_10");
  const cautionFonts = getFontsByCategory(fonts, "use_with_caution").slice(0, 16);
  const notRecommendedFonts = getFontsByCategory(fonts, "not_recommended").slice(0, 12);
  const manualCount = CAKE_TOPPER_FONT_RECOMMENDATIONS.length;

  return (
    <div className="font-advisor">
      {/* Top banner — same style as Designer header */}
      <header className="ct-app-header">
        <div className="ct-brand-lockup">
          <img
            className="ct-brand-logo"
            src="/brand/etch-n-shine-logo.png"
            alt="Etch N Shine"
          />
          <div>
            <p>Etch N Shine</p>
            <h1>Font Adviser</h1>
          </div>
        </div>
        <div className="ct-header-actions">
          <div className="fa-header-stats">
            <span>
              <strong>{fonts.length}</strong>
              loaded fonts
            </span>
            <span>
              <strong>{manualCount}</strong>
              manual rules
            </span>
            <span>
              <strong>{topFonts.length}</strong>
              top picks
            </span>
          </div>
        </div>
      </header>

      {/* Scoring model */}
      <Accordion title="Scoring Model" defaultOpen={true}>
        <div className="font-score-cards" aria-label="Font scoring model">
          <div>
            <BadgeCheck size={19} aria-hidden="true" />
            <strong>Structural suitability</strong>
            <span>35 pts</span>
          </div>
          <div>
            <Layers size={19} aria-hidden="true" />
            <strong>Cake topper aesthetics</strong>
            <span>25 pts</span>
          </div>
          <div>
            <Search size={19} aria-hidden="true" />
            <strong>Readability</strong>
            <span>15 pts</span>
          </div>
          <div>
            <BadgeCheck size={19} aria-hidden="true" />
            <strong>Weldability and joins</strong>
            <span>15 pts</span>
          </div>
          <div>
            <Layers size={19} aria-hidden="true" />
            <strong>Pairing flexibility</strong>
            <span>10 pts</span>
          </div>
        </div>
      </Accordion>

      {/* Font ranking tables — both inside one accordion, side by side */}
      <Accordion title="Font Rankings" badge={topFonts.length + nextFonts.length} defaultOpen={true}>
        <div className="font-advisor-grid">
          <div>
            <p className="fa-table-label">Top 20 Cake Topper Fonts</p>
            <FontTable fonts={topFonts} />
          </div>
          <div>
            <p className="fa-table-label">Next Best 20 Fonts</p>
            <FontTable fonts={nextFonts} />
          </div>
        </div>
      </Accordion>

      {/* Font pairings */}
      <Accordion
        title="Font Pairings"
        badge={`${FONT_PAIRING_RECOMMENDATIONS.length} suggestions`}
        defaultOpen={false}
      >
        <div className="font-table-wrap">
          <table className="font-table">
            <thead>
              <tr>
                <th>Pairing Type</th>
                <th>Main Font</th>
                <th>Supporting Font</th>
                <th>Best For</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {FONT_PAIRING_RECOMMENDATIONS.map((pairing) => (
                <tr key={`${pairing.pairingType}-${pairing.mainFont}`}>
                  <td>{pairing.pairingType}</td>
                  <td>{pairing.mainFont}</td>
                  <td>{pairing.supportingFont}</td>
                  <td>{pairing.bestFor}</td>
                  <td>{pairing.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      {/* Category previews — 4 columns in one accordion */}
      <Accordion title="Font Categories" defaultOpen={true}>
        <div className="fa-4col-grid">
          <CategorySection title="Best Script Fonts" category="script" fonts={fonts} />
          <CategorySection title="Best Serif Fonts" category="serif" fonts={fonts} />
          <CategorySection title="Best Sans-serif Fonts" category="sans_serif" fonts={fonts} />
          <CategorySection title="Supporting Text Fonts" category="supporting_text" fonts={fonts} />
        </div>
      </Accordion>

      {/* Caution / Not recommended — one accordion, 2 columns */}
      <Accordion
        title="Use With Caution & Not Recommended"
        badge={getFontsByCategory(fonts, "use_with_caution").length + getFontsByCategory(fonts, "not_recommended").length}
        defaultOpen={false}
      >
        <div className="font-advisor-grid">
          <div>
            <p className="fa-table-label fa-table-label--warning">
              {FONT_CATEGORY_LABELS.use_with_caution}
              <span>{getFontsByCategory(fonts, "use_with_caution").length}</span>
            </p>
            <div className="font-caution-list">
              {cautionFonts.map((font) => {
                const classification = getFontClassification(font);
                return (
                  <article key={font.id}>
                    <strong>{font.full_name}</strong>
                    <span>{classification.riskNotes}</span>
                  </article>
                );
              })}
            </div>
          </div>
          <div>
            <p className="fa-table-label fa-table-label--danger">
              {FONT_CATEGORY_LABELS.not_recommended}
              <span>{getFontsByCategory(fonts, "not_recommended").length}</span>
            </p>
            <div className="font-caution-list">
              {notRecommendedFonts.map((font) => {
                const classification = getFontClassification(font);
                return (
                  <article key={font.id}>
                    <strong>{font.full_name}</strong>
                    <span>{classification.riskNotes}</span>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </Accordion>

      {/* Manually uploaded fonts */}
      <Accordion
        title="Manually Uploaded Fonts"
        badge={uploadedFonts.length || undefined}
        defaultOpen={uploadedFonts.length > 0}
      >
        {uploadedFonts.length === 0 ? (
          <p className="fa-empty-note">
            No fonts uploaded yet. Use the <strong>Fonts</strong> tab to upload a .ttf or .otf file.
          </p>
        ) : (
          <>
            <p className="fa-empty-note">
              These fonts were added via the Fonts tab. They appear in the Designer and category
              sections automatically. Add a manual override in{" "}
              <code>cakeTopperFontRecommendations.ts</code> to promote a font into the Top 20 after
              test-cutting it.
            </p>
            <div className="font-table-wrap">
              <table className="font-table">
                <thead>
                  <tr>
                    <th>Font Name</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Category</th>
                    <th>Risk</th>
                    <th>Why It Works</th>
                    <th>Risk Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFonts.map((font) => {
                    const c = getFontClassification(font);
                    return (
                      <tr key={font.id}>
                        <td>{font.full_name}</td>
                        <td>{FONT_TYPE_LABELS[c.type]}</td>
                        <td>{c.score}</td>
                        <td>{c.category.replace(/_/g, " ")}</td>
                        <td>
                          <span className={`fonts-risk fonts-risk--${c.riskLevel}`}>
                            {c.riskLevel}
                          </span>
                        </td>
                        <td>{c.whyItWorks}</td>
                        <td>{c.riskNotes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Accordion>

      {/* Production notes */}
      <Accordion title="Production Notes" defaultOpen={true}>
        <div className="fa-production-note">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>
            Prefer bold or medium weights for supporting text, keep scripts large, check detached
            dots and swashes, and verify counters in letters like a, e, o, b, d, p, g, A, O, P,
            and R. The app visually overlaps paths; final SVGs should still be reviewed in
            LightBurn before cutting.
          </p>
        </div>
      </Accordion>
    </div>
  );
}

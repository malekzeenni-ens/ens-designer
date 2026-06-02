import { AlertTriangle, BadgeCheck, Layers, Search } from "lucide-react";

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
}

function FontTable({ title, fonts }: { title: string; fonts: FontInfo[] }) {
  return (
    <section className="font-advisor-section">
      <div className="font-advisor-heading">
        <h2>{title}</h2>
        <span>{fonts.length} fonts</span>
      </div>
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
    </section>
  );
}

function CategoryPreview({
  title,
  category,
  fonts,
}: {
  title: string;
  category: CakeTopperFontCategory;
  fonts: FontInfo[];
}) {
  const categoryFonts = getFontsByCategory(fonts, category).slice(0, 12);
  return (
    <section className="font-category-panel">
      <div className="font-advisor-heading">
        <h2>{title}</h2>
        <span>{getFontsByCategory(fonts, category).length}</span>
      </div>
      <div className="font-pill-list">
        {categoryFonts.map((font) => {
          const classification = getFontClassification(font);
          return (
            <span key={font.id} className={`font-pill font-pill--${classification.riskLevel}`}>
              {font.full_name}
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function FontAdvisorPanel({ fonts }: FontAdvisorPanelProps) {
  const topFonts = getRankedFonts(fonts, "top_10");
  const nextFonts = getRankedFonts(fonts, "next_best_10");
  const cautionFonts = getFontsByCategory(fonts, "use_with_caution").slice(0, 16);
  const notRecommendedFonts = getFontsByCategory(fonts, "not_recommended").slice(0, 12);
  const manualCount = CAKE_TOPPER_FONT_RECOMMENDATIONS.length;

  return (
    <div className="font-advisor">
      <section className="font-advisor-hero">
        <div>
          <p className="font-advisor-kicker">Cake Topper Font Advisor</p>
          <h1>Production-aware font guidance</h1>
          <p>
            Rankings combine practical laser-cut heuristics with manual overrides from the loaded
            font library. They are guidance for 3mm acrylic work, not a replacement for LightBurn
            inspection or test cuts.
          </p>
        </div>
        <div className="font-advisor-stats">
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
      </section>

      <section className="font-score-cards" aria-label="Font scoring model">
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
      </section>

      <FontTable title="Top 20 Cake Topper Fonts" fonts={topFonts} />
      <FontTable title="Next Best 20 Fonts" fonts={nextFonts} />

      <section className="font-advisor-grid">
        <CategoryPreview title="Best Script Fonts" category="script" fonts={fonts} />
        <CategoryPreview title="Best Serif Fonts" category="serif" fonts={fonts} />
        <CategoryPreview title="Best Sans-serif Fonts" category="sans_serif" fonts={fonts} />
        <CategoryPreview title="Supporting Text Fonts" category="supporting_text" fonts={fonts} />
      </section>

      <section className="font-advisor-section">
        <div className="font-advisor-heading">
          <h2>Font Pairings</h2>
          <span>{FONT_PAIRING_RECOMMENDATIONS.length} suggestions</span>
        </div>
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
      </section>

      <section className="font-advisor-grid">
        <section className="font-category-panel font-category-panel--warning">
          <div className="font-advisor-heading">
            <h2>{FONT_CATEGORY_LABELS.use_with_caution}</h2>
            <span>{getFontsByCategory(fonts, "use_with_caution").length}</span>
          </div>
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
        </section>

        <section className="font-category-panel font-category-panel--danger">
          <div className="font-advisor-heading">
            <h2>{FONT_CATEGORY_LABELS.not_recommended}</h2>
            <span>{getFontsByCategory(fonts, "not_recommended").length}</span>
          </div>
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
        </section>
      </section>

      <section className="font-production-notes" role="note">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <h2>Production Notes</h2>
          <p>
            Prefer bold or medium weights for supporting text, keep scripts large, check detached
            dots and swashes, and verify counters in letters like a, e, o, b, d, p, g, A, O, P,
            and R. The app visually overlaps paths; final SVGs should still be reviewed in
            LightBurn before cutting.
          </p>
        </div>
      </section>
    </div>
  );
}

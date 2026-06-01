import { useEffect, useState } from "react";

import { CakeTopperPanel } from "./components/CakeTopperPanel";
import { fetchFonts } from "./services/generationApi";
import type { FontInfo } from "./types/design";

export function App() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

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
          <CakeTopperPanel fonts={fonts} />
        )}
      </section>
    </main>
  );
}

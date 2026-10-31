import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { applyAppearance, readAppearance } from "./appearance";
import "./styles.css";
import "./theme.css";
import "./appearance.css";
import "./designer-v3.css";
import "./unified-header.css";

applyAppearance(readAppearance());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

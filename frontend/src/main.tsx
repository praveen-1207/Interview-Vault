// main.tsx — the app's entry point. This is the FIRST file the browser loads.
// It creates the React root and renders <App /> (which sets up auth context,
// routing, and every page) into the <div id="root"> element in index.html.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// createRoot attaches React to the DOM. StrictMode is a dev-only helper that
// double-invokes render/effects to surface bugs early — harmless in production.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

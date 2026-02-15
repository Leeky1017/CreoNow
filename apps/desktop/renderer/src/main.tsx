import "./styles/main.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";

import { App } from "./App";
import { ErrorBoundary } from "./components/patterns";
import { i18n } from "./i18n";

// Signal that React app has mounted
if (typeof window.__CN_E2E__ !== "object") {
  window.__CN_E2E__ = { ready: true };
} else {
  window.__CN_E2E__.ready = true;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

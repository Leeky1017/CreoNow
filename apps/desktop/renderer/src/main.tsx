import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";

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
    <App />
  </React.StrictMode>,
);

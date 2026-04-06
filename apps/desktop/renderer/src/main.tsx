import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { RendererApp } from "@/features/workbench/RendererApp";
import "@/i18n/config";
import { installGlobalErrorHandlers } from "@/lib/globalErrorBridge";
import "@/styles/index.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Renderer root element not found");
}

document.documentElement.classList.add(
  (() => {
    const stored = localStorage.getItem("creonow:theme");
    if (stored === "light") return "light";
    if (stored === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  })(),
);

const storedFontSize = localStorage.getItem("creonow:editor-font-size");
if (storedFontSize) {
  document.documentElement.style.setProperty("--text-editor-size", storedFontSize);
}
installGlobalErrorHandlers();

createRoot(rootElement).render(
  <StrictMode>
    <RendererApp />
  </StrictMode>,
);
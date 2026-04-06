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

document.documentElement.classList.add("dark");
installGlobalErrorHandlers();

createRoot(rootElement).render(
  <StrictMode>
    <RendererApp />
  </StrictMode>,
);
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: path.join(__dirname, "main/src/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: path.join(__dirname, "preload/src/index.ts"),
      },
    },
  },
  renderer: {
    root: path.join(__dirname, "renderer"),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: path.join(__dirname, "renderer/index.html"),
      },
      outDir: path.join(__dirname, "dist/renderer"),
      emptyOutDir: true,
    },
  },
});

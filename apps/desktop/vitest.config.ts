import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "renderer/src"),
      "@shared": path.resolve(__dirname, "../../packages/shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "renderer/src/testSetup.ts")],
    include: ["renderer/src/**/*.test.ts", "renderer/src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
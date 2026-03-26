import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedAliasPath = path.join(__dirname, "../../packages/shared");

function copyBuiltinSkillsPlugin() {
  return {
    name: "creonow-copy-builtin-skills",
    closeBundle() {
      const src = path.join(__dirname, "main", "skills");
      const dest = path.join(__dirname, "dist", "main", "skills");
      if (!fs.existsSync(src)) return;
      fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
    },
  } as const;
}

function copyBuiltinProjectTemplatesPlugin() {
  return {
    name: "creonow-copy-builtin-project-templates",
    closeBundle() {
      const src = path.join(__dirname, "main", "templates", "project");
      const dest = path.join(__dirname, "dist", "main", "templates", "project");
      if (!fs.existsSync(src)) return;
      fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
    },
  } as const;
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      copyBuiltinSkillsPlugin(),
      copyBuiltinProjectTemplatesPlugin(),
    ],
    resolve: {
      alias: {
        "@shared": sharedAliasPath,
      },
    },
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: path.join(__dirname, "main/src/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@shared": sharedAliasPath,
      },
    },
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: path.join(__dirname, "preload/src/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
  },
});

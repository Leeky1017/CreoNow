import assert from "node:assert/strict";

import electronViteConfig from "../../../electron.vite.config";

type NamedPlugin = {
  name?: string;
};

type MainConfig = {
  plugins?: NamedPlugin[];
};

const config = electronViteConfig as { main: MainConfig };
const pluginNames = (config.main.plugins ?? [])
  .map((plugin) => plugin.name)
  .filter((name): name is string => typeof name === "string");

// S1-BUNDLE-TPL-1
// main build must include the builtin template copy plugin for bundled runtime.
assert.equal(
  pluginNames.includes("creonow-copy-builtin-project-templates"),
  true,
  "main build should copy builtin project templates into dist/main",
);

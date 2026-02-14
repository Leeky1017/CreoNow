import assert from "node:assert/strict";
import path from "node:path";

import electronViteConfig from "../../../electron.vite.config";

type AliasRecord = Record<string, string>;

type ViteSection = {
  resolve?: {
    alias?: AliasRecord | Array<{ find: string | RegExp; replacement: string }>;
  };
};

function resolveAlias(
  section: ViteSection,
  aliasKey: string,
): string | undefined {
  const alias = section.resolve?.alias;
  if (!alias) {
    return undefined;
  }

  if (Array.isArray(alias)) {
    const hit = alias.find((item) => item.find === aliasKey);
    return hit?.replacement;
  }

  return alias[aliasKey];
}

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const expectedSharedPath = path.join(repoRoot, "packages/shared");

// S1-PA-2
// should configure @shared alias for main/preload/renderer build sections
{
  const config = electronViteConfig as {
    main: ViteSection;
    preload: ViteSection;
    renderer: ViteSection;
  };

  const sections: Array<[string, ViteSection]> = [
    ["main", config.main],
    ["preload", config.preload],
    ["renderer", config.renderer],
  ];

  for (const [name, section] of sections) {
    const aliasValue = resolveAlias(section, "@shared");
    assert.ok(aliasValue, `${name} must define @shared alias`);
    assert.equal(
      path.normalize(aliasValue as string),
      path.normalize(expectedSharedPath),
      `${name} @shared alias should point to packages/shared`,
    );
  }
}

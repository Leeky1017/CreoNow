import fs from "node:fs";
import path from "node:path";

type RuntimeMode = "source" | "dist";

type RuntimeLayout = {
  desktopRoot: string;
  mode: RuntimeMode;
};

function resolveRuntimeLayout(runtimePath: string): RuntimeLayout | null {
  const normalizedPath = path.resolve(runtimePath);
  const distMainMarker = `${path.sep}dist${path.sep}main`;
  const sourceMainMarker = `${path.sep}main${path.sep}src`;

  const distMarkerIndex = normalizedPath.lastIndexOf(distMainMarker);
  if (distMarkerIndex >= 0) {
    return {
      desktopRoot: normalizedPath.slice(0, distMarkerIndex),
      mode: "dist",
    };
  }

  const sourceMarkerIndex = normalizedPath.lastIndexOf(sourceMainMarker);
  if (sourceMarkerIndex >= 0) {
    return {
      desktopRoot: normalizedPath.slice(0, sourceMarkerIndex),
      mode: "source",
    };
  }

  return null;
}

export function resolveTemplateDirectoryFromBuildConfig(args: {
  moduleFilePath: string;
}): string {
  const runtimeLayout = resolveRuntimeLayout(args.moduleFilePath);
  if (!runtimeLayout) {
    throw new Error(
      `Unsupported main runtime module location: ${path.resolve(args.moduleFilePath)}`,
    );
  }

  if (runtimeLayout.mode === "dist") {
    return path.join(runtimeLayout.desktopRoot, "dist/main/templates/project");
  }

  return path.join(runtimeLayout.desktopRoot, "main/templates/project");
}

export function resolvePreloadEntryPathFromBuildConfig(args: {
  mainModuleDir: string;
  existsSyncImpl?: (candidatePath: string) => boolean;
}): string {
  const runtimeLayout = resolveRuntimeLayout(args.mainModuleDir);
  if (!runtimeLayout) {
    throw new Error(
      `Unsupported main runtime module location: ${path.resolve(args.mainModuleDir)}`,
    );
  }

  const preloadEntryPath = path.join(
    runtimeLayout.desktopRoot,
    "dist/preload/index.cjs",
  );
  const existsSyncImpl = args.existsSyncImpl ?? fs.existsSync;
  if (!existsSyncImpl(preloadEntryPath)) {
    throw new Error(`Preload entry not found at ${preloadEntryPath}`);
  }

  return preloadEntryPath;
}

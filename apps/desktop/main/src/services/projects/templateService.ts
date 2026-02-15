import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type BuiltInTemplateId =
  | "novel"
  | "short-story"
  | "screenplay"
  | "custom";

export type ProjectTemplateInput =
  | {
      kind: "builtin";
      id: string;
    }
  | {
      kind: "custom";
      structure: {
        folders: string[];
        files: Array<{ path: string; content?: string }>;
      };
    };

export type TemplateSeedDocument = {
  title: string;
  contentMd: string;
};

type BuiltInTemplate = {
  id: BuiltInTemplateId;
  name: string;
  documents: TemplateSeedDocument[];
};

type Ok<T> = { ok: true; data: T };
type Err = {
  ok: false;
  error: {
    field: string;
    message: string;
  };
};

type Result<T> = Ok<T> | Err;

let builtInTemplateCache: Map<BuiltInTemplateId, BuiltInTemplate> | null = null;

function fail(field: string, message: string): Err {
  return {
    ok: false,
    error: { field, message },
  };
}

function getTemplateDirPath(): string {
  const filePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(filePath), "../../../templates/project");
}

function normalizeBuiltInTemplateId(rawId: string): BuiltInTemplateId | null {
  switch (rawId) {
    case "novel":
    case "preset-novel":
      return "novel";
    case "short-story":
    case "short":
    case "preset-short":
      return "short-story";
    case "screenplay":
    case "preset-script":
      return "screenplay";
    case "custom":
    case "preset-other":
      return "custom";
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadBuiltInTemplates(): Result<
  Map<BuiltInTemplateId, BuiltInTemplate>
> {
  if (builtInTemplateCache) {
    return { ok: true, data: builtInTemplateCache };
  }

  const directory = getTemplateDirPath();
  const filenames = fs
    .readdirSync(directory)
    .filter((filename) => filename.endsWith(".json"));

  const map = new Map<BuiltInTemplateId, BuiltInTemplate>();

  for (const filename of filenames) {
    const raw = fs.readFileSync(path.join(directory, filename), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return fail(
        "template.resource",
        `Invalid template resource format: ${filename}`,
      );
    }

    const id =
      typeof parsed.id === "string"
        ? normalizeBuiltInTemplateId(parsed.id)
        : null;
    if (!id) {
      return fail("template.resource.id", `Invalid template id in ${filename}`);
    }

    if (typeof parsed.name !== "string" || parsed.name.trim().length === 0) {
      return fail(
        "template.resource.name",
        `Template name is required in ${filename}`,
      );
    }

    if (!Array.isArray(parsed.documents)) {
      return fail(
        "template.resource.documents",
        `Template documents must be an array in ${filename}`,
      );
    }

    const documents: TemplateSeedDocument[] = [];

    for (let index = 0; index < parsed.documents.length; index += 1) {
      const document = parsed.documents[index];
      if (!isRecord(document)) {
        return fail(
          `template.resource.documents[${index}]`,
          `Document entry must be object in ${filename}`,
        );
      }

      if (
        typeof document.title !== "string" ||
        document.title.trim().length === 0
      ) {
        return fail(
          `template.resource.documents[${index}].title`,
          `Document title is required in ${filename}`,
        );
      }

      if (
        document.contentMd !== undefined &&
        typeof document.contentMd !== "string"
      ) {
        return fail(
          `template.resource.documents[${index}].contentMd`,
          `contentMd must be a string in ${filename}`,
        );
      }

      documents.push({
        title: document.title.trim(),
        contentMd:
          typeof document.contentMd === "string" ? document.contentMd : "",
      });
    }

    map.set(id, {
      id,
      name: parsed.name.trim(),
      documents,
    });
  }

  builtInTemplateCache = map;
  return { ok: true, data: map };
}

function formatTitleFromPath(filePath: string): string {
  const base = path.basename(filePath).replace(/\.[^/.]+$/, "");
  const normalized = base.trim().replace(/[_-]+/g, " ");
  if (normalized.length === 0) {
    return "Untitled";
  }
  return normalized
    .split(/\s+/)
    .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1))
    .join(" ");
}

function validateCustomTemplateStructure(
  structure: unknown,
): Result<{ files: Array<{ path: string; content: string }> }> {
  if (!isRecord(structure)) {
    return fail("template.structure", "template.structure must be an object");
  }

  if (!Array.isArray(structure.folders)) {
    return fail(
      "template.structure.folders",
      "template.structure.folders must be an array",
    );
  }

  for (let i = 0; i < structure.folders.length; i += 1) {
    const folder = structure.folders[i];
    if (typeof folder !== "string" || folder.trim().length === 0) {
      return fail(
        `template.structure.folders[${i}]`,
        `template.structure.folders[${i}] must be a non-empty string`,
      );
    }
  }

  if (!Array.isArray(structure.files)) {
    return fail(
      "template.structure.files",
      "template.structure.files must be an array",
    );
  }

  const files: Array<{ path: string; content: string }> = [];

  for (let i = 0; i < structure.files.length; i += 1) {
    const file = structure.files[i];
    if (!isRecord(file)) {
      return fail(
        `template.structure.files[${i}]`,
        `template.structure.files[${i}] must be an object`,
      );
    }

    if (typeof file.path !== "string" || file.path.trim().length === 0) {
      return fail(
        `template.structure.files[${i}].path`,
        `template.structure.files[${i}].path must be a non-empty string`,
      );
    }

    if (file.content !== undefined && typeof file.content !== "string") {
      return fail(
        `template.structure.files[${i}].content`,
        `template.structure.files[${i}].content must be a string`,
      );
    }

    files.push({
      path: file.path,
      content: typeof file.content === "string" ? file.content : "",
    });
  }

  return { ok: true, data: { files } };
}

export function resolveTemplateSeedDocuments(
  templateInput?: ProjectTemplateInput,
): Result<TemplateSeedDocument[]> {
  if (!templateInput) {
    return { ok: true, data: [] };
  }

  if (templateInput.kind === "builtin") {
    const normalizedId = normalizeBuiltInTemplateId(templateInput.id);
    if (!normalizedId) {
      return fail(
        "template.id",
        `Unknown built-in template id: ${templateInput.id}`,
      );
    }

    const builtIns = loadBuiltInTemplates();
    if (!builtIns.ok) {
      return builtIns;
    }

    const template = builtIns.data.get(normalizedId);
    if (!template) {
      return fail(
        "template.id",
        `Built-in template not found: ${normalizedId}`,
      );
    }

    return {
      ok: true,
      data: template.documents.map((document) => ({
        title: document.title,
        contentMd: document.contentMd,
      })),
    };
  }

  const validated = validateCustomTemplateStructure(templateInput.structure);
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    data: validated.data.files.map((file) => ({
      title: formatTitleFromPath(file.path),
      contentMd: file.content,
    })),
  };
}

export function __resetTemplateServiceCacheForTests(): void {
  builtInTemplateCache = null;
}

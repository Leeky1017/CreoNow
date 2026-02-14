import type { IpcError } from "@shared/types/ipc-generated";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type DeriveResult<T> = Ok<T> | Err;

export type DerivedContent = {
  contentText: string;
  contentMd: string;
};

type ProseMirrorNode = {
  type: string;
  text?: string;
  content?: ProseMirrorNode[];
};

function ipcError(message: string, details?: unknown): Err {
  return { ok: false, error: { code: "INVALID_ARGUMENT", message, details } };
}

function normalizeNewlines(s: string): string {
  return s.replaceAll("\r\n", "\n");
}

function isProseMirrorNode(value: unknown): value is ProseMirrorNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function isBlockNode(type: string): boolean {
  return (
    type === "paragraph" ||
    type === "heading" ||
    type === "blockquote" ||
    type === "list_item"
  );
}

function walkText(node: ProseMirrorNode, out: string[]): void {
  if (node.type === "text") {
    out.push(normalizeNewlines(node.text ?? ""));
    return;
  }

  const children = node.content ?? [];
  for (const child of children) {
    if (!isProseMirrorNode(child)) {
      continue;
    }
    walkText(child, out);
  }

  if (isBlockNode(node.type)) {
    out.push("\n");
  }
}

/**
 * Derive `content_text` and `content_md` from a TipTap/ProseMirror JSON document.
 *
 * Why: V1 SSOT is `content_json`; derived fields must be deterministic and must
 * never become a second truth source.
 */
export function deriveContent(args: {
  contentJson: unknown;
}): DeriveResult<DerivedContent> {
  if (!isProseMirrorNode(args.contentJson)) {
    return ipcError("Invalid TipTap JSON document");
  }

  const out: string[] = [];
  walkText(args.contentJson, out);
  const text = out.join("").replace(/\n+$/u, "");

  return {
    ok: true,
    data: {
      contentText: text,
      contentMd: text,
    },
  };
}

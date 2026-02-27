import { createHash } from "node:crypto";

/**
 * Build a SHA-256 hex digest from UTF-8 text.
 *
 * Why: hash derivation must stay identical across runtime call sites.
 */
export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Alias for hashing plain text content.
 */
export function hashText(text: string): string {
  return sha256Hex(text);
}

/**
 * Alias for hashing serialized JSON payloads.
 */
export function hashJson(json: string): string {
  return sha256Hex(json);
}

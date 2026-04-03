import { sha256 } from "js-sha256";

export function sha256Hex(text: string): string {
  return sha256(text);
}
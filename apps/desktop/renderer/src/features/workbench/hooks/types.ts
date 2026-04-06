import type { PreloadApi } from "@/lib/preloadApi";
import type { WorkbenchContextToken } from "@/features/workbench/runtime";

/** Mutable ref container — use instead of React.RefObject when external mutation is needed. */
export type MutableRef<T> = { current: T };

export type SaveState = "idle" | "saving" | "saved" | "error";

export type SaveRequestToken = {
  context: WorkbenchContextToken | null;
  requestId: number;
};

export type SaveDocumentResult = Awaited<ReturnType<PreloadApi["file"]["saveDocument"]>>;

export type PendingAutosaveDraft = {
  contentJson: string;
  context: WorkbenchContextToken;
  request: SaveRequestToken;
};

export type InFlightAutosave = {
  context: WorkbenchContextToken;
  promise: Promise<SaveDocumentResult>;
  request: SaveRequestToken;
};

export type AutosaveControllerState = {
  draft: PendingAutosaveDraft | null;
  saveState: SaveState;
};

export type AcceptSaveRetryControllerState = {
  preview: import("@/features/workbench/runtime").AiPreview | null;
  saveState: SaveState;
};

export type AutosaveToastEvent = {
  eventId: number;
  errorMessage?: string;
  kind: "error" | "success";
};

export type LeftPanelId =
  | "files"
  | "search"
  | "outline"
  | "versionHistory"
  | "memory"
  | "characters"
  | "knowledgeGraph"
  | "settings";

export type RightPanelId = "ai" | "info" | "quality";

export type DragState =
  | { panel: "left"; startWidth: number; startX: number }
  | { panel: "right"; startWidth: number; startX: number }
  | null;

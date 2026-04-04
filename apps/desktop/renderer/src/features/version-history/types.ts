import type { IpcResponseData } from "@shared/types/ipc-generated";

export type VersionHistorySnapshotSummary = IpcResponseData<"version:snapshot:list">["items"][number];
export type VersionHistorySnapshotDetail = IpcResponseData<"version:snapshot:read">;

export type VersionHistoryStatus = "idle" | "loading" | "ready" | "error";
export type VersionHistoryAction = "rollback" | "restore" | null;

export interface VersionHistoryDocumentRef {
  documentId: string;
  projectId: string;
}

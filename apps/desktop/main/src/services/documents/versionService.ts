import { createDocumentCoreService } from "./documentCoreService";
import type {
  ServiceResult,
  SubServiceFactoryArgs,
  VersionService,
} from "./types";

export type ThreeStageCommitStage =
  | "snapshot-created"
  | "ai-writing"
  | "user-confirmed"
  | "user-rejected";

export interface ThreeStageCommit {
  stage: ThreeStageCommitStage;
  preWriteSnapshotId: string;
  documentId: string;
  executionId: string;
}

/**
 * Build version-focused document service.
 *
 * Why: facade composes stable public contract from dedicated domain services.
 */
export function createVersionService(
  args: SubServiceFactoryArgs,
): VersionService {
  const { baseService, ...coreArgs } = args;
  const service = baseService ?? createDocumentCoreService(coreArgs);
  return {
    listVersions: service.listVersions,
    readVersion: service.readVersion,
    diffVersions: service.diffVersions,
    rollbackVersion: service.rollbackVersion,
    restoreVersion: service.restoreVersion,
  };
}

export interface VersionWorkflowService {
  createPreWriteSnapshot(args: {
    projectId: string;
    documentId: string;
    executionId: string;
    contentJson: unknown;
  }): ServiceResult<ThreeStageCommit>;
  markAiWriting(executionId: string): ServiceResult<ThreeStageCommit>;
  confirmCommit(executionId: string): ServiceResult<ThreeStageCommit>;
  rejectCommit(args: {
    executionId: string;
    projectId: string;
  }): ServiceResult<ThreeStageCommit>;
  readCommit(executionId: string): ThreeStageCommit | null;
}

/**
 * Build three-stage commit workflow around the existing version core service.
 *
 * Why: keep INV-1 fail-closed guarantees co-located with pre-write snapshots.
 */
export function createVersionWorkflowService(
  args: SubServiceFactoryArgs,
): VersionWorkflowService {
  const { baseService, ...coreArgs } = args;
  const service = baseService ?? createDocumentCoreService(coreArgs);
  const commits = new Map<string, ThreeStageCommit>();

  const readCommit = (executionId: string): ThreeStageCommit | null =>
    commits.get(executionId) ?? null;

  return {
    createPreWriteSnapshot(params) {
      const saved = service.save({
        projectId: params.projectId,
        documentId: params.documentId,
        contentJson: params.contentJson,
        actor: "auto",
        reason: "pre-write",
      });
      if (!saved.ok || !saved.data.versionId) {
        return {
          ok: false,
          error: {
            code: saved.ok ? "DB_ERROR" : saved.error.code,
            message: saved.ok
              ? "Pre-write snapshot did not return versionId"
              : saved.error.message,
            ...(saved.ok
              ? {}
              : {
                  ...(saved.error.details !== undefined
                    ? { details: saved.error.details }
                    : {}),
                  ...(saved.error.retryable !== undefined
                    ? { retryable: saved.error.retryable }
                    : {}),
                }),
          },
        };
      }

      const commit: ThreeStageCommit = {
        stage: "snapshot-created",
        preWriteSnapshotId: saved.data.versionId,
        documentId: params.documentId,
        executionId: params.executionId,
      };
      commits.set(params.executionId, commit);
      return { ok: true, data: commit };
    },
    markAiWriting(executionId) {
      const current = readCommit(executionId);
      if (!current) {
        return { ok: false, error: { code: "NOT_FOUND", message: "Commit not found" } };
      }
      const updated: ThreeStageCommit = { ...current, stage: "ai-writing" };
      commits.set(executionId, updated);
      return { ok: true, data: updated };
    },
    confirmCommit(executionId) {
      const current = readCommit(executionId);
      if (!current) {
        return { ok: false, error: { code: "NOT_FOUND", message: "Commit not found" } };
      }
      const updated: ThreeStageCommit = { ...current, stage: "user-confirmed" };
      commits.set(executionId, updated);
      return { ok: true, data: updated };
    },
    rejectCommit({ executionId, projectId }) {
      const current = readCommit(executionId);
      if (!current) {
        return { ok: false, error: { code: "NOT_FOUND", message: "Commit not found" } };
      }
      const rollback = service.rollbackVersion({
        projectId,
        documentId: current.documentId,
        versionId: current.preWriteSnapshotId,
      });
      if (!rollback.ok) {
        return rollback;
      }
      const updated: ThreeStageCommit = { ...current, stage: "user-rejected" };
      commits.set(executionId, updated);
      return { ok: true, data: updated };
    },
    readCommit,
  };
}

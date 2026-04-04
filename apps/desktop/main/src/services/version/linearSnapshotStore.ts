/**
 * LinearSnapshotStore — 线性快照存储
 *
 * 线性链（parentSnapshotId），回退自动创建 pre-rollback 快照
 * 三阶段提交：pre-write → ai-accept → confirm/rollback
 */

export type SnapshotReason =
  | "manual-save"
  | "autosave"
  | "pre-write"
  | "ai-accept"
  | "pre-rollback"
  | "rollback";

export type SnapshotActor = "user" | "ai" | "auto";

export interface LinearSnapshot {
  id: string;
  documentId: string;
  projectId: string;
  content: Record<string, unknown>;
  reason: SnapshotReason;
  createdAt: string;
  actor: SnapshotActor;
  wordCount: number;
  parentSnapshotId: string | null;
}

interface CreateSnapshotParams {
  documentId: string;
  projectId: string;
  content: Record<string, unknown>;
  actor: SnapshotActor;
  reason: SnapshotReason;
}

export interface LinearSnapshotStore {
  createSnapshot(params: CreateSnapshotParams): Promise<LinearSnapshot>;
  listSnapshots(documentId: string): Promise<LinearSnapshot[]>;
  rollbackTo(documentId: string, snapshotId: string): Promise<LinearSnapshot>;
}

function countWords(content: Record<string, unknown>): number {
  const doc = content.doc as Record<string, unknown> | undefined;
  if (!doc) return 0;
  const contentArr = doc.content as Array<Record<string, unknown>> | undefined;
  if (!contentArr) return 0;

  let text = "";
  for (const block of contentArr) {
    const children = block.content as Array<Record<string, unknown>> | undefined;
    if (!children) continue;
    for (const child of children) {
      if (child.type === "text" && typeof child.text === "string") {
        text += child.text;
      }
    }
  }

  // CJK: each character is a word
  return [...text].filter((c) => c.trim().length > 0).length;
}

function cloneContent<TContent extends Record<string, unknown>>(content: TContent): TContent {
  return JSON.parse(JSON.stringify(content)) as TContent;
}

export function createLinearSnapshotStore(): LinearSnapshotStore {
  // Per-instance ID counter (E1: was global, now per-instance)
  let nextId = 1;

  function generateId(): string {
    return `snap-${String(nextId++).padStart(4, "0")}`;
  }

  // Per-document snapshot chains
  const snapshots = new Map<string, LinearSnapshot[]>();

  function getLatestSnapshot(documentId: string): LinearSnapshot | null {
    const chain = snapshots.get(documentId);
    if (!chain || chain.length === 0) return null;
    return chain[chain.length - 1];
  }

  return {
    async createSnapshot(params: CreateSnapshotParams): Promise<LinearSnapshot> {
      const latest = getLatestSnapshot(params.documentId);

        const snapshot: LinearSnapshot = {
          id: generateId(),
          documentId: params.documentId,
          projectId: params.projectId,
          content: cloneContent(params.content),
          reason: params.reason,
          createdAt: new Date().toISOString(),
          actor: params.actor,
        wordCount: countWords(params.content),
        parentSnapshotId: latest?.id ?? null,
      };

      if (!snapshots.has(params.documentId)) {
        snapshots.set(params.documentId, []);
      }
      snapshots.get(params.documentId)!.push(snapshot);

      return snapshot;
    },

    async listSnapshots(documentId: string): Promise<LinearSnapshot[]> {
      const chain = snapshots.get(documentId);
      if (!chain) return [];
      // Reverse chronological order
      return [...chain].reverse().map((snapshot) => ({
        ...snapshot,
        content: cloneContent(snapshot.content),
      }));
    },

    async rollbackTo(documentId: string, snapshotId: string): Promise<LinearSnapshot> {
      const chain = snapshots.get(documentId);
      if (!chain) {
        throw new Error(`No snapshots found for document "${documentId}"`);
      }

      const target = chain.find((s) => s.id === snapshotId);
      if (!target) {
        throw new Error(`Snapshot "${snapshotId}" not found for document "${documentId}"`);
      }

      const latest = chain[chain.length - 1];

      // Create pre-rollback snapshot with current content
        const preRollback: LinearSnapshot = {
          id: generateId(),
          documentId,
          projectId: latest.projectId,
          content: cloneContent(latest.content),
          reason: "pre-rollback",
        createdAt: new Date().toISOString(),
        actor: "user",
        wordCount: countWords(latest.content),
        parentSnapshotId: latest.id,
      };
      chain.push(preRollback);

      // Create rollback snapshot with target content
        const rollbackSnap: LinearSnapshot = {
          id: generateId(),
          documentId,
          projectId: target.projectId,
          content: cloneContent(target.content),
          reason: "rollback",
        createdAt: new Date().toISOString(),
        actor: "user",
        wordCount: countWords(target.content),
        parentSnapshotId: preRollback.id,
      };
      chain.push(rollbackSnap);

      return rollbackSnap;
    },
  };
}

import assert from "node:assert/strict";

import type { Logger } from "../../logging/logger";
import type { EmbeddingComputeRunner } from "../../services/embedding/embeddingComputeOffload";
import type {
  SemanticChunk,
  SemanticChunkIndexService,
} from "../../services/embedding/semanticChunkIndexService";
import { createSemanticAutosaveEmbeddingRuntime } from "../file";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createSemanticIndexStub(args: {
  onUpsert?: (payload: {
    projectId: string;
    documentId: string;
    contentText: string;
    updatedAt: number;
    model?: string;
  }) => void;
}): SemanticChunkIndexService {
  return {
    upsertDocument: (payload) => {
      args.onUpsert?.(payload);
      return {
        ok: true,
        data: {
          changedChunkIds: ["chunk-1"],
          unchangedChunkIds: [],
          removedChunkIds: [],
          totalChunks: 1,
        },
      };
    },
    reindexProject: () => ({
      ok: true,
      data: {
        indexedDocuments: 0,
        indexedChunks: 0,
        changedChunks: 0,
      },
    }),
    search: () => ({ ok: true, data: { chunks: [] } }),
    listProjectChunks: (): SemanticChunk[] => [],
  };
}

async function runScenario(
  name: string,
  fn: () => Promise<void> | void,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new Error(
      `[${name}] ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function main(): Promise<void> {
  await runScenario(
    "BE-EMR-S1/S2 should offload autosave semantic upsert via queue + compute runner",
    async () => {
      let runCalls = 0;
      let inComputeRunner = false;
      const observedDocuments: string[] = [];

      const computeRunner: EmbeddingComputeRunner = {
        run: async (args) => {
          runCalls += 1;
          inComputeRunner = true;
          try {
            return {
              status: "completed",
              value: await args.execute(new AbortController().signal),
            };
          } finally {
            inComputeRunner = false;
          }
        },
      };

      const runtime = createSemanticAutosaveEmbeddingRuntime({
        logger: createLogger(),
        semanticIndex: createSemanticIndexStub({
          onUpsert: (payload) => {
            assert.equal(
              inComputeRunner,
              true,
              "semantic upsert must run in compute runner",
            );
            observedDocuments.push(payload.documentId);
          },
        }),
        computeRunner,
        debounceMs: 0,
      });

      assert.ok(runtime, "runtime should be created when dependencies exist");
      runtime.enqueue({
        projectId: "project-1",
        documentId: "doc-1",
        contentText: "hello",
        updatedAt: 7,
      });

      await sleep(10);

      assert.equal(runCalls, 1);
      assert.deepEqual(observedDocuments, ["doc-1"]);
    },
  );

  await runScenario(
    "BE-EMR-S1 should reuse injected embedding queue when provided",
    () => {
      const enqueued: string[] = [];

      const runtime = createSemanticAutosaveEmbeddingRuntime({
        logger: createLogger(),
        embeddingQueue: {
          enqueue: (task) => {
            enqueued.push(`${task.projectId}:${task.documentId}`);
          },
        },
      });

      assert.ok(runtime, "runtime should use injected queue");

      runtime.enqueue({
        projectId: "project-2",
        documentId: "doc-2",
        contentText: "queued",
        updatedAt: 8,
      });

      assert.deepEqual(enqueued, ["project-2:doc-2"]);
    },
  );

  await runScenario(
    "BE-EMR-S2 should disable semantic autosave runtime when compute runner is missing",
    () => {
      const runtime = createSemanticAutosaveEmbeddingRuntime({
        logger: createLogger(),
        semanticIndex: createSemanticIndexStub({}),
      });

      assert.equal(runtime, null);
    },
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

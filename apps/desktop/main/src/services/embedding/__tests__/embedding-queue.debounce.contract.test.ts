import assert from "node:assert/strict";

import {
  createEmbeddingQueue,
  type EmbeddingQueueTask,
} from "../embeddingQueue";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scenario: BE-EMR-S1
 * enqueue should debounce and dedupe by documentId.
 */
{
  const executed: EmbeddingQueueTask[] = [];
  const queue = createEmbeddingQueue({
    debounceMs: 20,
    run: async (task) => {
      executed.push(task);
    },
  });

  queue.enqueue({
    projectId: "project-1",
    documentId: "doc-1",
    contentText: "first",
    updatedAt: 1,
  });
  await sleep(5);

  queue.enqueue({
    projectId: "project-1",
    documentId: "doc-1",
    contentText: "second",
    updatedAt: 2,
  });
  await sleep(5);

  queue.enqueue({
    projectId: "project-1",
    documentId: "doc-1",
    contentText: "latest",
    updatedAt: 3,
  });

  await sleep(40);

  assert.equal(executed.length, 1);
  assert.equal(executed[0]?.documentId, "doc-1");
  assert.equal(executed[0]?.contentText, "latest");
  assert.equal(executed[0]?.updatedAt, 3);
}

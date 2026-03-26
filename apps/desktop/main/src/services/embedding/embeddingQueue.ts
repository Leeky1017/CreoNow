export type EmbeddingQueueTask = {
  projectId: string;
  documentId: string;
  contentText: string;
  updatedAt: number;
};

type EmbeddingQueueTimer = ReturnType<typeof setTimeout>;

type ScheduledTask = {
  task: EmbeddingQueueTask;
  timer: EmbeddingQueueTimer;
};

export type EmbeddingQueue = {
  enqueue: (task: EmbeddingQueueTask) => void;
  dispose: () => void;
};

export function createEmbeddingQueue(args: {
  run: (task: EmbeddingQueueTask) => Promise<void> | void;
  debounceMs?: number;
  onError?: (error: unknown, task: EmbeddingQueueTask) => void;
}): EmbeddingQueue {
  const debounceMs = Math.max(0, Math.floor(args.debounceMs ?? 120));
  const scheduledByDocumentId = new Map<string, ScheduledTask>();

  const runTask = (task: EmbeddingQueueTask): void => {
    void Promise.resolve(args.run(task)).catch((error) => {
      args.onError?.(error, task);
    });
  };

  return {
    enqueue: (task) => {
      const key = task.documentId;
      const existing = scheduledByDocumentId.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        const pending = scheduledByDocumentId.get(key);
        if (!pending) {
          return;
        }
        scheduledByDocumentId.delete(key);
        runTask(pending.task);
      }, debounceMs);

      scheduledByDocumentId.set(key, {
        task,
        timer,
      });
    },

    dispose: () => {
      for (const pending of scheduledByDocumentId.values()) {
        clearTimeout(pending.timer);
      }
      scheduledByDocumentId.clear();
    },
  };
}

export type MockIPCListener<TPayload> = (payload: TPayload) => void;

export type MockIPCEmitter<TPayload> = {
  channel: string;
  on: (listener: MockIPCListener<TPayload>) => void;
  removeListener: (listener: MockIPCListener<TPayload>) => void;
  emit: (payload: TPayload) => void;
  listenerCount: () => number;
  clear: () => void;
};

/**
 * Create a lightweight push-emitter test double with explicit listener lifecycle.
 *
 * Why: push subscription leak checks need deterministic listener accounting.
 */
export function createMockIPCEmitter<TPayload>(
  channel: string,
): MockIPCEmitter<TPayload> {
  const listeners = new Set<MockIPCListener<TPayload>>();

  return {
    channel,
    on: (listener) => {
      listeners.add(listener);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
    emit: (payload) => {
      for (const listener of [...listeners]) {
        listener(payload);
      }
    },
    listenerCount: () => listeners.size,
    clear: () => {
      listeners.clear();
    },
  };
}

export type MockIPCCall = {
  channel: string;
  payload: unknown;
};

export type MockIPCChannelListener = (event: unknown, payload: unknown) => void;

export type MockIPCRenderer = {
  invoke: (channel: string, payload: unknown) => Promise<unknown>;
  send: (channel: string, payload: unknown) => void;
  on: (channel: string, listener: MockIPCChannelListener) => MockIPCRenderer;
  removeListener: (
    channel: string,
    listener: MockIPCChannelListener,
  ) => MockIPCRenderer;
  emit: (channel: string, payload: unknown) => void;
  invokeCalls: () => MockIPCCall[];
  sendCalls: () => MockIPCCall[];
  listenerCount: (channel?: string) => number;
};

export type CreateMockIPCRendererArgs = {
  invokeResponse?:
    | unknown
    | ((channel: string, payload: unknown) => unknown | Promise<unknown>);
};

/**
 * Create a preload-side ipcRenderer test double with call recording.
 *
 * Why: preload forwarding tests must assert exact channel + payload.
 */
export function createMockIPCRenderer(
  args: CreateMockIPCRendererArgs = {},
): MockIPCRenderer {
  const invokeRecorded: MockIPCCall[] = [];
  const sendRecorded: MockIPCCall[] = [];
  const listeners = new Map<string, Set<MockIPCChannelListener>>();

  const resolveInvoke =
    typeof args.invokeResponse === "function"
      ? args.invokeResponse
      : async () => args.invokeResponse;

  const api: MockIPCRenderer = {
    invoke: async (channel: string, payload: unknown) => {
      invokeRecorded.push({ channel, payload });
      return await resolveInvoke(channel, payload);
    },
    send: (channel: string, payload: unknown) => {
      sendRecorded.push({ channel, payload });
    },
    on: (channel: string, listener: MockIPCChannelListener) => {
      const channelListeners = listeners.get(channel) ?? new Set();
      channelListeners.add(listener);
      listeners.set(channel, channelListeners);
      return api;
    },
    removeListener: (channel: string, listener: MockIPCChannelListener) => {
      const channelListeners = listeners.get(channel);
      if (channelListeners) {
        channelListeners.delete(listener);
      }
      return api;
    },
    emit: (channel: string, payload: unknown) => {
      const channelListeners = listeners.get(channel);
      if (!channelListeners) {
        return;
      }
      for (const listener of [...channelListeners]) {
        listener({}, payload);
      }
    },
    invokeCalls: () => [...invokeRecorded],
    sendCalls: () => [...sendRecorded],
    listenerCount: (channel?: string) => {
      if (channel) {
        return listeners.get(channel)?.size ?? 0;
      }
      let total = 0;
      for (const channelListeners of listeners.values()) {
        total += channelListeners.size;
      }
      return total;
    },
  };

  return api;
}

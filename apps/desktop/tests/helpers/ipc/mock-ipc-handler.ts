export type MockIPCHandler<TPayload, TResponse> = {
  channel: string;
  invoke: (payload: TPayload) => Promise<TResponse>;
  calls: () => TPayload[];
  reset: () => void;
};

type MockIPCHandlerResponseFactory<TPayload, TResponse> =
  | TResponse
  | ((payload: TPayload) => TResponse | Promise<TResponse>);

/**
 * Create a deterministic main-handler test double for Node-only unit tests.
 *
 * Why: IPC handler behavior should be testable without a real Electron runtime.
 */
export function createMockIPCHandler<TPayload, TResponse>(
  channel: string,
  response: MockIPCHandlerResponseFactory<TPayload, TResponse>,
): MockIPCHandler<TPayload, TResponse> {
  const seenCalls: TPayload[] = [];
  const resolveResponse =
    typeof response === "function"
      ? (response as (payload: TPayload) => TResponse | Promise<TResponse>)
      : () => response;

  return {
    channel,
    invoke: async (payload: TPayload) => {
      seenCalls.push(payload);
      return await resolveResponse(payload);
    },
    calls: () => [...seenCalls],
    reset: () => {
      seenCalls.length = 0;
    },
  };
}

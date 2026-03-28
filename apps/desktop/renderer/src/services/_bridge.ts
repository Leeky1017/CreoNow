type IpcResponse<T> =
  | { ok: true; data: T; meta: { requestId: string; ts: number } }
  | { ok: false; error: { code: string; message: string; retryable: boolean }; meta: { requestId: string; ts: number } };

export async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const response = await window.creonow.invoke(channel, payload) as IpcResponse<T>;
  if (!response.ok) {
    throw new Error(`[IPC:${response.error.code}] ${response.error.message}`);
  }
  return response.data;
}

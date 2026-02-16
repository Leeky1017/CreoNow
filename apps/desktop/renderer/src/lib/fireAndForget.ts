/**
 * Execute a promise-returning task without awaiting the caller path.
 *
 * Why: renderer fire-and-forget flows must always attach rejection handling.
 */
export function runFireAndForget(
  task: () => Promise<void>,
  onError?: (error: unknown) => void,
): void {
  const errorHandler =
    onError ??
    ((error: unknown) => {
      console.error("[fire-and-forget] task failed", error);
    });

  void task().catch((error) => {
    errorHandler(error);
  });
}

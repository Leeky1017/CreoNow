import type { MutableRefObject } from "react";

export type BootstrapStatus = "loading" | "ready" | "error";

export function applyBootstrapStatus(
  nextStatus: BootstrapStatus,
  bootstrapStatusRef: MutableRefObject<BootstrapStatus>,
  setBootstrapStatus: (status: BootstrapStatus) => void,
) {
  bootstrapStatusRef.current = nextStatus;
  setBootstrapStatus(nextStatus);
}

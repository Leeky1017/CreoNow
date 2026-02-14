import type { AiStreamEvent } from "@shared/types/ai";

export type IpcPushBackpressureDropEvent = {
  droppedInWindow: number;
  limitPerSecond: number;
  timestamp: number;
};

type CreateIpcPushBackpressureGateArgs = {
  limitPerSecond: number;
  now?: () => number;
  onDrop?: (event: IpcPushBackpressureDropEvent) => void;
};

function nowTs(): number {
  return Date.now();
}

/**
 * Build an event-rate gate that drops low-priority `chunk` events under pressure.
 *
 * Why: event storms must not destabilize IPC push delivery for critical control events.
 */
export function createIpcPushBackpressureGate(
  args: CreateIpcPushBackpressureGateArgs,
): {
  shouldDeliver: (event: AiStreamEvent) => boolean;
} {
  const getNow = args.now ?? nowTs;

  let currentSecond = Math.floor(getNow() / 1_000);
  let deliveredDeltaInWindow = 0;
  let droppedInWindow = 0;
  let dropSignaled = false;

  function rotateWindowIfNeeded(second: number): void {
    if (second === currentSecond) {
      return;
    }

    currentSecond = second;
    deliveredDeltaInWindow = 0;
    droppedInWindow = 0;
    dropSignaled = false;
  }

  return {
    shouldDeliver: (event: AiStreamEvent) => {
      const timestamp = getNow();
      rotateWindowIfNeeded(Math.floor(timestamp / 1_000));

      if (event.type !== "chunk") {
        return true;
      }

      if (deliveredDeltaInWindow < args.limitPerSecond) {
        deliveredDeltaInWindow += 1;
        return true;
      }

      droppedInWindow += 1;
      if (!dropSignaled) {
        dropSignaled = true;
        args.onDrop?.({
          droppedInWindow,
          limitPerSecond: args.limitPerSecond,
          timestamp,
        });
      }

      return false;
    },
  };
}

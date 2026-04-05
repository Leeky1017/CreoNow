import type { ProjectLifecycle } from "./projectLifecycle";

const P3_PARTICIPANT_IDS = [
  "settings",
  "simple-memory",
  "project-config",
  "search",
] as const;

export type P3ParticipantId = (typeof P3_PARTICIPANT_IDS)[number];

type ParticipantHook = {
  bind?: (args: { projectId: string; traceId: string }) => Promise<void> | void;
  unbind?: (args: { projectId: string; traceId: string }) => Promise<void> | void;
};

type ParticipantSnapshot = {
  bindCount: number;
  unbindCount: number;
  lastBoundProjectId: string | null;
  lastUnboundProjectId: string | null;
};

const participantHooks = new Map<P3ParticipantId, Set<ParticipantHook>>();
const participantSnapshots = new Map<P3ParticipantId, ParticipantSnapshot>(
  P3_PARTICIPANT_IDS.map((participantId) => [
    participantId,
    {
      bindCount: 0,
      unbindCount: 0,
      lastBoundProjectId: null,
      lastUnboundProjectId: null,
    },
  ]),
);

function getParticipantSnapshot(participantId: P3ParticipantId): ParticipantSnapshot {
  const existing = participantSnapshots.get(participantId);
  if (existing) {
    return existing;
  }
  const created: ParticipantSnapshot = {
    bindCount: 0,
    unbindCount: 0,
    lastBoundProjectId: null,
    lastUnboundProjectId: null,
  };
  participantSnapshots.set(participantId, created);
  return created;
}

export function attachP3LifecycleParticipant(
  participantId: P3ParticipantId,
  hook: ParticipantHook,
): () => void {
  const hooks = participantHooks.get(participantId) ?? new Set<ParticipantHook>();
  hooks.add(hook);
  participantHooks.set(participantId, hooks);
  return () => {
    const existing = participantHooks.get(participantId);
    if (!existing) {
      return;
    }
    existing.delete(hook);
    if (existing.size === 0) {
      participantHooks.delete(participantId);
    }
  };
}

async function runHooks(
  participantId: P3ParticipantId,
  phase: "bind" | "unbind",
  args: { projectId: string; traceId: string },
): Promise<void> {
  const snapshot = getParticipantSnapshot(participantId);
  if (phase === "bind") {
    snapshot.bindCount += 1;
    snapshot.lastBoundProjectId = args.projectId;
  } else {
    snapshot.unbindCount += 1;
    snapshot.lastUnboundProjectId = args.projectId;
  }

  const hooks = participantHooks.get(participantId);
  if (!hooks) {
    return;
  }

  for (const hook of hooks) {
    const handler = phase === "bind" ? hook.bind : hook.unbind;
    if (!handler) {
      continue;
    }
    await handler(args);
  }
}

export function getP3LifecycleParticipantSnapshot(
  participantId: P3ParticipantId,
): ParticipantSnapshot {
  return { ...getParticipantSnapshot(participantId) };
}

export function resetP3LifecycleParticipantsForTests(): void {
  for (const participantId of P3_PARTICIPANT_IDS) {
    participantSnapshots.set(participantId, {
      bindCount: 0,
      unbindCount: 0,
      lastBoundProjectId: null,
      lastUnboundProjectId: null,
    });
  }
}

export function registerP3LifecycleParticipants(
  projectLifecycle: ProjectLifecycle,
): void {
  for (const participantId of P3_PARTICIPANT_IDS) {
    projectLifecycle.register({
      id: participantId,
      unbind: async ({ projectId, traceId }) => {
        await runHooks(participantId, "unbind", { projectId, traceId });
      },
      bind: async ({ projectId, traceId }) => {
        await runHooks(participantId, "bind", { projectId, traceId });
      },
    });
  }
}

export { P3_PARTICIPANT_IDS };

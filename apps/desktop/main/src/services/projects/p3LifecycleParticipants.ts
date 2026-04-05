import type { ProjectLifecycle } from "./projectLifecycle";

const P3_PARTICIPANT_IDS = [
  "settings",
  "simple-memory",
  "project-config",
  "search",
] as const;

export function registerP3LifecycleParticipants(
  projectLifecycle: ProjectLifecycle,
): void {
  for (const participantId of P3_PARTICIPANT_IDS) {
    projectLifecycle.register({
      id: participantId,
      unbind: () => {},
      bind: () => {},
    });
  }
}

export { P3_PARTICIPANT_IDS };

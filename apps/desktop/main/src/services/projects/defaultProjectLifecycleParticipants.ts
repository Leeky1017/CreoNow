import type { ContextProjectScopedCache } from "../context/projectScopedCache";
import type { ProjectLifecycleParticipant } from "./projectLifecycle";

export function createDefaultProjectLifecycleParticipants(args: {
  contextCache: ContextProjectScopedCache;
}): ProjectLifecycleParticipant[] {
  return [
    {
      id: "context",
      unbind: ({ projectId, traceId, signal }) => {
        if (signal.aborted) {
          return;
        }
        args.contextCache.unbindProject({ projectId, traceId });
      },
      bind: ({ projectId, traceId, signal }) => {
        if (signal.aborted) {
          return;
        }
        args.contextCache.bindProject({ projectId, traceId });
      },
    },
    {
      id: "settings",
      unbind: () => {},
      bind: () => {},
    },
    {
      id: "simple-memory",
      unbind: () => {},
      bind: () => {},
    },
    {
      id: "project-search",
      unbind: () => {},
      bind: () => {},
    },
  ];
}

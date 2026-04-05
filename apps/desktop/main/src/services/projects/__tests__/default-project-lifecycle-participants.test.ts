import assert from "node:assert/strict";

import { createDefaultProjectLifecycleParticipants } from "../defaultProjectLifecycleParticipants";

const calls: string[] = [];

const participants = createDefaultProjectLifecycleParticipants({
  contextCache: {
    getOrComputeString: async ({ compute }) => await compute(),
    bindProject: ({ projectId, traceId }) => {
      calls.push(`bind:${projectId}:${traceId}`);
    },
    unbindProject: ({ projectId, traceId }) => {
      calls.push(`unbind:${projectId}:${traceId}`);
    },
  },
});

assert.deepEqual(
  participants.map((participant) => participant.id),
  ["context", "settings", "simple-memory", "project-search"],
);

await participants[0]?.unbind({
  projectId: "proj-a",
  traceId: "trace-1",
  signal: new AbortController().signal,
});
await participants[0]?.bind({
  projectId: "proj-b",
  traceId: "trace-2",
  signal: new AbortController().signal,
});

assert.deepEqual(calls, ["unbind:proj-a:trace-1", "bind:proj-b:trace-2"]);

console.log("default-project-lifecycle-participants.test.ts: all assertions passed");

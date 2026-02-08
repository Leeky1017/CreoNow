import assert from "node:assert/strict";

import { createProjectStore } from "../../renderer/src/stores/projectStore";

type Call = `flush` | `invoke:${string}`;

/**
 * PM2-S1
 * should flush pending autosave before switching project context
 */
async function main(): Promise<void> {
  const calls: Call[] = [];

  const invoke = (async (channel: string) => {
    calls.push(`invoke:${channel}`);

    if (channel === "project:project:switch") {
      return {
        ok: true,
        data: {
          currentProjectId: "proj-b",
          switchedAt: new Date(0).toISOString(),
        },
      };
    }

    if (channel === "project:project:setcurrent") {
      return {
        ok: true,
        data: {
          projectId: "proj-b",
          rootPath: "/tmp/proj-b",
        },
      };
    }

    return { ok: true, data: {} };
  }) as Parameters<typeof createProjectStore>[0]["invoke"];

  const flushPendingAutosave = async (): Promise<void> => {
    calls.push("flush");
  };

  const store = createProjectStore({
    invoke,
    // PM2 adds this dependency; kept as cast for RED phase before impl.
    flushPendingAutosave,
  } as Parameters<typeof createProjectStore>[0]);

  store.setState({
    current: { projectId: "proj-a", rootPath: "/tmp/proj-a" },
    items: [
      {
        projectId: "proj-a",
        name: "Project A",
        rootPath: "/tmp/proj-a",
        updatedAt: Date.now(),
      },
      {
        projectId: "proj-b",
        name: "Project B",
        rootPath: "/tmp/proj-b",
        updatedAt: Date.now(),
      },
    ],
    bootstrapStatus: "ready",
    lastError: null,
  });

  const result = await store.getState().setCurrentProject("proj-b");
  assert.equal(result.ok, true);

  assert.equal(calls[0], "flush");
  assert.equal(calls[1], "invoke:project:project:switch");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

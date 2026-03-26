import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type fs from "node:fs";

import type { Logger } from "../../../logging/logger";
import { createCreonowWatchService } from "../watchService";

class FakeWatcher extends EventEmitter {
  closed = false;

  close(): void {
    this.closed = true;
  }
}

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

// S1: watcher error should recover state and clear active watch flag [ADDED]
{
  const createdWatchers: FakeWatcher[] = [];
  const invalidations: Array<{ projectId: string; reason: "error" }> = [];

  const service = createCreonowWatchService({
    logger: createLogger(),
    watchFactory: (() => {
      const watcher = new FakeWatcher();
      createdWatchers.push(watcher);
      return watcher as unknown as fs.FSWatcher;
    }) as typeof fs.watch,
    onWatcherInvalidated: (event) => {
      invalidations.push(event);
    },
  });

  const started = service.start({
    projectId: "project-1",
    creonowRootPath: "/tmp/project-1/.creonow",
  });
  assert.equal(started.ok, true);
  assert.equal(service.isWatching({ projectId: "project-1" }), true);
  assert.equal(createdWatchers.length, 1);

  createdWatchers[0]?.emit("error", new Error("watch broken"));

  assert.equal(
    service.isWatching({ projectId: "project-1" }),
    false,
    "watch state should recover to non-watching after error",
  );
  assert.equal(createdWatchers[0]?.closed, true);
  assert.deepEqual(invalidations, [
    {
      projectId: "project-1",
      reason: "error",
    },
  ]);
}

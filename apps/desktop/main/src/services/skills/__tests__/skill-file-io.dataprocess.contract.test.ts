import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createSkillFileIo } from "../skillFileIo";

type DataProcessResult<T> =
  | { status: "completed"; value: T }
  | { status: "error" | "timeout" | "aborted" | "crashed"; error: Error };

type DataProcessLike = {
  run: <T>(args: {
    execute?: (signal: AbortSignal) => Promise<T>;
    run?: (signal: AbortSignal) => Promise<T>;
    timeoutMs?: number;
    signal?: AbortSignal;
    crashSignal?: AbortSignal;
  }) => Promise<DataProcessResult<T>>;
};

type ScenarioFn = () => Promise<void>;

async function runScenario(name: string, fn: ScenarioFn): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new Error(
      `[${name}] ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

await runScenario(
  "BE-SRH-S2 read/write should be delegated to data process (async)",
  async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-skill-io-"));
    const sourceFile = path.join(root, "source", "SKILL.md");
    const targetFile = path.join(root, "target", "SKILL.md");

    await fs.mkdir(path.dirname(sourceFile), { recursive: true });
    await fs.writeFile(sourceFile, "# source", "utf8");

    const runCalls: Array<{ timeoutMs?: number }> = [];
    const dataProcess: DataProcessLike = {
      run: async <T>(args: {
        execute?: (signal: AbortSignal) => Promise<T>;
        run?: (signal: AbortSignal) => Promise<T>;
        timeoutMs?: number;
      }): Promise<DataProcessResult<T>> => {
        runCalls.push({ timeoutMs: args.timeoutMs });
        const execute = args.execute ?? args.run;
        if (!execute) {
          return {
            status: "error",
            error: new Error("missing_execute"),
          };
        }
        const value = await execute(new AbortController().signal);
        return { status: "completed", value };
      },
    };

    const io = createSkillFileIo({
      dataProcess,
      timeoutMs: 123,
    });

    const read = await io.read({ filePath: sourceFile });
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.data, "# source");
    }

    const write = await io.write({
      filePath: targetFile,
      content: "# target",
    });
    assert.equal(write.ok, true);

    const targetContent = await fs.readFile(targetFile, "utf8");
    assert.equal(targetContent, "# target");

    assert.equal(
      runCalls.length,
      2,
      "read and write should both go through data process",
    );
    assert.equal(runCalls[0]?.timeoutMs, 123);
    assert.equal(runCalls[1]?.timeoutMs, 123);
  },
);

await runScenario(
  "BE-SRH-S2 should surface IO_ERROR when data process fails",
  async () => {
    const dataProcess: DataProcessLike = {
      run: async <T>(): Promise<DataProcessResult<T>> => {
        return {
          status: "crashed",
          error: new Error("data_process_down"),
        };
      },
    };

    const io = createSkillFileIo({ dataProcess, timeoutMs: 50 });

    const read = await io.read({ filePath: "/tmp/not-used.md" });
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.equal(read.error.code, "IO_ERROR");
      assert.equal(read.error.message, "Failed to read skill file");
    }

    const write = await io.write({
      filePath: "/tmp/not-used.md",
      content: "ignored",
    });
    assert.equal(write.ok, false);
    if (!write.ok) {
      assert.equal(write.error.code, "IO_ERROR");
      assert.equal(write.error.message, "Failed to write skill file");
    }
  },
);

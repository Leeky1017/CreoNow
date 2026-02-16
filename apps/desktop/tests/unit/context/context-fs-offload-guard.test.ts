import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  CONTEXT_FS_STREAM_READ_HARD_LIMIT_BYTES,
  CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES,
  readCreonowTextFileAsync,
  resolveContextFsReadStrategy,
} from "../../../main/src/services/context/contextFs";

// H2B-S1: threshold strategy chooses direct/stream paths deterministically [ADDED]
{
  assert.equal(resolveContextFsReadStrategy(1), "direct");
  assert.equal(
    resolveContextFsReadStrategy(CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES),
    "direct",
  );
  assert.equal(
    resolveContextFsReadStrategy(CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES + 1),
    "stream",
  );
}

// H2B-S2: oversized stream read triggers hard-limit guard with deterministic error [ADDED]
{
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "cn-context-fs-"));
  const rulesDir = path.join(tmpRoot, ".creonow", "rules");
  await mkdir(rulesDir, { recursive: true });

  const streamFilePath = path.join(rulesDir, "stream-ok.txt");
  const streamContent = "x".repeat(
    CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES + 1024,
  );
  await writeFile(streamFilePath, streamContent, "utf8");

  const streamRead = await readCreonowTextFileAsync({
    projectRootPath: tmpRoot,
    path: ".creonow/rules/stream-ok.txt",
  });
  assert.equal(streamRead.ok, true);
  if (streamRead.ok) {
    assert.equal(streamRead.data.content.length, streamContent.length);
    assert.equal(streamRead.data.sizeBytes, streamContent.length);
  }

  const tooLargePath = path.join(rulesDir, "stream-too-large.txt");
  const tooLargeContent = "x".repeat(
    CONTEXT_FS_STREAM_READ_HARD_LIMIT_BYTES + 1024,
  );
  await writeFile(tooLargePath, tooLargeContent, "utf8");

  const tooLargeRead = await readCreonowTextFileAsync({
    projectRootPath: tmpRoot,
    path: ".creonow/rules/stream-too-large.txt",
  });
  assert.equal(tooLargeRead.ok, false);
  if (!tooLargeRead.ok) {
    assert.equal(tooLargeRead.error.code, "IO_ERROR");
    assert.equal(
      tooLargeRead.error.message,
      "File exceeds stream read hard limit",
    );
    assert.deepEqual(tooLargeRead.error.details, {
      limitBytes: CONTEXT_FS_STREAM_READ_HARD_LIMIT_BYTES,
    });
  }

  await rm(tmpRoot, { recursive: true, force: true });
}

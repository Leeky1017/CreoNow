# Memory System Task Spec — issue-300-memory-system-p0-architecture-episodic-storage

## Scope

- Implement approved OpenSpec change: `memory-system-p0-architecture-episodic-storage`.
- Enforce Spec-first + TDD for scenarios:
  - MS1-R1-S1/S2/S3
  - MS1-R2-S1/S2/S3
  - MS1-R3-S1/S2
  - MS1-X-S1/S2

## Acceptance

- Working memory uses in-memory store only and enforces 8K token budget with importance-based eviction.
- Session end archives threshold-qualified preference signals into episodic storage and clears working memory.
- Episodic storage persists to SQLite with required indexes:
  - `project_id + created_at`
  - `scene_type`
  - `last_recalled_at`
- Implicit feedback extraction is a pure function with fixed weight constants for 6 signals.
- IPC channels are delivered and type-safe:
  - `memory:episode:record` (Fire-and-Forget style write path)
  - `memory:episode:query` (Request-Response recall path)
- Error handling is explicit and observable:
  - write failure retries up to 3 times and returns `MEMORY_EPISODE_WRITE_FAILED`
  - unrecoverable capacity pressure returns `MEMORY_CAPACITY_EXCEEDED`

## Dependency Sync Check

- Upstream dependency: none (this change is sequence #1 in `openspec/changes/EXECUTION_ORDER.md`).
- Check result before Red: `NO_DRIFT`.

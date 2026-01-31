# Proposal: issue-41-p0-009-memory-system

## Why
Deliver CN V1 memory system (CNWB-REQ-070): user-controlled memory CRUD + settings, injection preview with deterministic fallback, and a minimal preference-learning loop driven by `ai:skill:feedback`.

## What Changes
- Add SQLite tables for `user_memory` and `skill_feedback` (soft delete + learned origin).
- Add `memory:*` IPC channels and a `MemoryService` for CRUD/settings/preview.
- Extend `ai:skill:feedback` to accept `{ action, evidenceRef }`, persist feedback, and trigger preference learning.
- Inject memory into `ai:skill:run` input via a stable placeholder block (even when disabled).
- Add renderer `MemoryPanel` + `memoryStore` and unit/E2E coverage.

## Impact
- Affected specs: `openspec/specs/creonow-v1-workbench/spec.md#CNWB-REQ-070`
- Affected code: `apps/desktop/main/src/**`, `apps/desktop/renderer/src/**`, `packages/shared/types/ipc-generated.ts`
- Breaking change: YES (IPC contract update for `ai:skill:feedback`)
- User benefit: users can manage memories, preview injection deterministically, and accumulate learned preferences via feedback without blocking skills when semantic recall is unavailable.

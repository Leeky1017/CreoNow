## 1. Implementation

- [x] 1.1 Add `compaction` optional field to `file:document:save` IPC response schema
- [x] 1.2 Regenerate `packages/shared/types/ipc-generated.ts`

## 2. Testing

- [x] 2.1 Add/adjust contract unit test assertion for `file:document:save.response.compaction`
- [x] 2.2 Run `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit`

## 3. Documentation

- [x] 3.1 Update `openspec/_ops/task_runs/ISSUE-429.md` with red/green and merge evidence
- [ ] 3.2 Archive change/rulebook task after merge and clean worktree

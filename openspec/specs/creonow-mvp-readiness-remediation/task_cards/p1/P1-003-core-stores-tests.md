# P1-003: Core Stores 测试（Vitest）

Status: todo

## Goal

为核心 renderer stores 增加 Vitest 测试，补齐审评指出的“9 个 store 仅 1 个有测试”的短板。

必须覆盖的 stores（写死）：

- `aiStore`
- `editorStore`
- `fileStore`
- `projectStore`
- `versionStore`
- `searchStore`
- `kgStore`
- `memoryStore`
- `layoutStore`

## Dependencies

- Spec: `../spec.md#cnmvp-req-005`（CI 必须跑 `test:run`）
- Design: `../design/05-test-strategy-and-ci.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/stores/aiStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/editorStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/fileStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/projectStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/versionStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/searchStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/kgStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/memoryStore.test.tsx` |
| Add | `apps/desktop/renderer/src/stores/layoutStore.test.tsx` |

## Detailed Breakdown（每个 store 的最小测试模板）

每个 store 至少覆盖：

1. 初始 state 正确
2. 一个 happy path（invoke ok）
3. 一个错误 path（invoke error → lastError/status 变化）
4. 一个边界/竞态（例如重复 bootstrap / 快速切换）

Mock 规则写死：

- 所有 IPC 通过注入的 `deps.invoke` stub（禁止真实 window IPC）
- 使用 `renderHook + Provider` 模式参考 `onboardingStore.test.tsx`

## Acceptance Criteria

- [ ] 9 个 store 均有 tests 且可在本地跑通
- [ ] CI `pnpm -C apps/desktop test:run` 通过
- [ ] 测试包含至少一个“快速切换/重复调用”的边界用例（防竞态回归）

## Tests

- [ ] `pnpm -C apps/desktop test:run`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`


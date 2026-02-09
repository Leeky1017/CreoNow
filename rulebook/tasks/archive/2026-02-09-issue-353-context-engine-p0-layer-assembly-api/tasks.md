## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #353，建立 `task/353-context-engine-p0-layer-assembly-api` worktree
- [x] 1.2 Rulebook task 创建并 validate 通过
- [x] 1.3 Red：新增 CE1 场景测试并记录失败证据
- [x] 1.4 Green：实现 `layerAssemblyService` 与 `context:prompt:assemble/inspect` IPC handler
- [x] 1.5 同步 IPC contract + codegen（`packages/shared/types/ipc-generated.ts`）
- [x] 1.6 Refactor：抽离层契约校验与 warnings 归并逻辑

## 2. Testing

- [x] 2.1 运行 CE1 新增单测并通过
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`

## 3. Documentation

- [x] 3.1 更新 change proposal/spec/tasks 与通道命名一致性
- [x] 3.2 记录 `openspec/_ops/task_runs/ISSUE-353.md`（含 Red/Green/门禁证据）
- [x] 3.3 归档 `openspec/changes/context-engine-p0-layer-assembly-api` 并更新 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.4 PR + auto-merge + main 收口后归档 Rulebook task

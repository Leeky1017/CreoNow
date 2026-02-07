## 1. Implementation

- [x] 1.1 新增并执行 `ipc-channel-naming-governance` Red 测试（S1~S4）。
- [x] 1.2 在 `contract-generate` 实现 domain 白名单与三段式强校验。
- [x] 1.3 在 `contract-generate` 实现 preload method 名冲突检测与定位信息。
- [x] 1.4 迁移现有 channel 名称并更新主进程/渲染进程/测试调用点。
- [x] 1.5 生成并校验 `packages/shared/types/ipc-generated.ts`。

## 2. Testing

- [x] 2.1 Red 证据：新治理测试先失败（错误码与详情断言）。
- [x] 2.2 Green 证据：`pnpm test:unit` 全绿。
- [x] 2.3 契约门禁：`pnpm contract:check` 全绿。
- [x] 2.4 质量门禁：`pnpm typecheck`、`pnpm lint` 全绿。

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/ipc-p1-channel-naming-governance/tasks.md` 完成状态。
- [x] 3.2 记录并维护 `openspec/_ops/task_runs/ISSUE-258.md`（含 Red/Green 证据）。
- [ ] 3.3 合并后归档 Rulebook task（阶段 6）。

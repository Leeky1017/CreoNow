## 1. Implementation

- [x] 1.1 建立 `openspec/changes/issue-326-layer2-layer3-integration-gate` 三件套（proposal/tasks/spec delta）
- [x] 1.2 形成 Layer2+Layer3 跨模块 delta report（Implemented / Partial / Missing）
- [x] 1.3 更新 `openspec/changes/EXECUTION_ORDER.md` 与活跃 change 状态

## 2. Testing

- [x] 2.1 执行 `rulebook task validate issue-326-layer2-layer3-integration-gate`
- [x] 2.2 复核跨模块契约漂移证据命令（`rg` 核对通道、envelope、错误码）
- [x] 2.3 运行最小门禁校验 `pnpm contract:check`

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-326.md` 并记录集成检查命令与结果
- [x] 3.2 在 RUN_LOG 中补齐 delta 结论与后续动作

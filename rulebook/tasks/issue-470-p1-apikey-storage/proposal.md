# Proposal: issue-470-p1-apikey-storage

## Why

`openspec/changes/p1-apikey-storage` 仍处于活跃目录且 `tasks.md` 未完成，缺少可审计的 Red/Green 证据与交付收口。需要在不扩展范围的前提下，完成该 change 既定场景测试、证据落盘、规则门禁与主干合并。

## What Changes

- 补齐并执行 `p1-apikey-storage` 的 Scenario 映射测试（S1-S7，含连接测试边界）
- 更新 `openspec/changes/p1-apikey-storage/tasks.md` 的 Red/Green/Refactor/Evidence 章节
- 新增并维护 `openspec/_ops/task_runs/ISSUE-470.md` 记录关键命令与结果
- 完成交付门禁（preflight + required checks + auto-merge）并收口控制面 `main`
- 在 change 完成后归档 `p1-apikey-storage` 并同步 `openspec/changes/EXECUTION_ORDER.md`

## Impact

- Affected specs:
  - `openspec/changes/p1-apikey-storage/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/archive/...`（归档后路径）
- Affected code:
  - `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
  - （如需最小修复）`apps/desktop/main/src/services/ai/aiProxySettingsService.ts`
- Breaking change: NO
- User benefit: API Key 安全存储变更具备完整可追踪证据并完成治理闭环。

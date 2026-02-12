# Proposal: issue-483-p1-aistore-messages

## Why

`openspec/changes/p1-aistore-messages` 仍在活跃目录，`tasks.md` 未收口，且 `ChatMessageManager` 对 `metadata` 的防御性拷贝缺口导致外部返回值可污染内部状态。需要按 OpenSpec + Rulebook + GitHub 门禁完成 Red/Green、证据落盘、change 归档与主干收口。

## What Changes

- 补齐 `p1-aistore-messages` 的 Scenario 映射与 Red/Green/Refactor/Evidence 章节
- 新增失败测试覆盖：外部修改 `getMessages()` 返回值中的 `metadata` 不得污染内部状态
- 最小实现修复 `chatMessageManager.ts`：对消息与一层 `metadata` 做防御性克隆
- 新增 `openspec/_ops/task_runs/ISSUE-483.md`，记录依赖同步检查、Red/Green、门禁与合并证据
- 完成 `p1-aistore-messages` 归档与 `openspec/changes/EXECUTION_ORDER.md` 同步

## Impact

- Affected specs:
  - `openspec/changes/p1-aistore-messages/tasks.md`
  - `openspec/changes/archive/p1-aistore-messages/**`（归档后）
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/_ops/task_runs/ISSUE-483.md`
- Affected code:
  - `apps/desktop/main/src/services/ai/chatMessageManager.ts`
  - `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`
- Breaking change: NO
- User benefit: 对话消息管理满足不可变契约，且该 change 完整进入可审计、可追溯、可合并的交付闭环。

# Proposal: issue-477-p1-assemble-prompt

## Why

`openspec/changes/p1-assemble-prompt` 仍在 active 且 `tasks.md` 未完成，缺少可审计 Red/Green 证据和归档收口。
同时历史入口 issue #456 已关闭，按治理规则必须使用新的 OPEN issue 完成交付闭环。

## What Changes

- 绑定 OPEN issue #477，并在 `task/477-p1-assemble-prompt` worktree 内执行交付。
- 补齐 `assembleSystemPrompt` 的 TDD 证据：先 Red（空 identity 产生占位分隔符失败）再 Green（最小修复通过）。
- 更新 `openspec/changes/p1-assemble-prompt/tasks.md` 与 delta spec，补充边界场景（空 identity 跳过占位）。
- 新建 `openspec/_ops/task_runs/ISSUE-477.md` 记录关键命令输入输出。
- 完成后归档 `p1-assemble-prompt` 到 `openspec/changes/archive/`，并同步 `openspec/changes/EXECUTION_ORDER.md`。

## Impact

- Affected specs:
  - `openspec/changes/p1-assemble-prompt/tasks.md`
  - `openspec/changes/p1-assemble-prompt/specs/ai-service-delta.md`
  - `openspec/_ops/task_runs/ISSUE-477.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/ai/assembleSystemPrompt.ts`
  - `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
- Breaking change: NO
- User benefit: 系统提示词组装在空 identity 边界下不再产生前导空占位，且 change 交付证据完整可审计。

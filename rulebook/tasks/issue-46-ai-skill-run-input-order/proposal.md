# Proposal: issue-46-ai-skill-run-input-order

## Why
修复 skills 系统引入后导致的 E2E 回归：`ai:skill:run` 当前将 `prompt.user` 模板与 input 渲染成同一条 user message，Fake AI server 会回显最后一条 user message，导致 `ai-apply` 等 E2E 断言被 prompt 内容污染而失败。

## What Changes
- Update: 调整 skill prompt 注入方式：`prompt.user` 与 raw input 分离为两条 user message，并保证 raw input 始终为最后一条 user message。
- Add: unit regression test 覆盖该 ordering，快速阻止同类回归。

## Impact
- Affected specs: `openspec/specs/creonow-v1-workbench/design/09-ai-runtime-and-network.md`；`openspec/specs/creonow-v1-workbench/design/06-skill-system.md`
- Affected code: `apps/desktop/main/src/ipc/ai.ts`、`apps/desktop/main/src/services/ai/aiService.ts`、unit/e2e tests
- Breaking change: NO（IPC contract 不变；仅修复 provider 请求构造）
- User benefit: 恢复 Windows E2E 确定性；技能 prompt 不再污染 input 语义，运行结果更可预期。

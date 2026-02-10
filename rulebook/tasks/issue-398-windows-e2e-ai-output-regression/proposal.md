# Proposal: issue-398-windows-e2e-ai-output-regression

## Why

PR #397 合并后 `windows-e2e` 持续失败，核心症状为 `ai-output` / `ai-diff` 缺失，导致 `ai-apply`、`knowledge-graph`、`search-rag` 等用例超时。  
本地复现实验与 CI 一致，并在主进程日志中稳定出现：

- `ipc_response_validation_failed`
- `channel: "ai:skill:run"`
- `issueCount: 1`

进一步排查确认：`SkillExecutor` 新增内部字段 `contextPrompt`，`ai:skill:run` 成功响应使用 `...res.data` 直接透传，触发 IPC 运行时响应契约“禁止额外字段”校验失败，最终被包装为 `INTERNAL_ERROR`，前端无法拿到可渲染的 AI 输出。

## What Changes

- 新增回归测试：覆盖 `ai:skill:run` 在 runtime validation 包裹下的成功路径，确保带文档上下文时不会被响应契约拦截。
- 最小修复 `ai:skill:run` 成功响应：仅返回契约允许字段（`executionId`、`runId`、`outputText`、`candidates`、`usage`、`promptDiagnostics`），不再泄露内部 `contextPrompt`。
- 保持 `contextPrompt` 仅用于主进程内部 LLM system 注入，不进入 IPC 响应边界。
- 回归验证此前失败的 E2E 套件，确认 `ai-output` / `ai-diff` 恢复。

## Impact

- Affected specs:
  - `openspec/specs/ai-service/spec.md`（沿用现有契约与交互要求）
  - `openspec/specs/ipc/spec.md`（沿用“运行时校验 + 统一 envelope”要求）
  - 结论：本次为实现回归修复，主 spec 无新增 delta。
- Affected code:
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/tests/unit/ai-skill-prompt-ordering.test.ts`（新增回归断言）
  - `openspec/_ops/task_runs/ISSUE-398.md`
- Breaking change: NO
- User benefit: 恢复 AI 面板输出与 Diff 渲染，消除 Windows E2E 回归并恢复主干门禁稳定性。

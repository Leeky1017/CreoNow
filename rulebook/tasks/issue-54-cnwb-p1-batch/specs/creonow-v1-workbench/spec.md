# Spec Delta: creonow-v1-workbench (ISSUE-54)

本任务交付 `creonow-v1-workbench` 的 P1 能力闭环：主题切换、统计看板、导出、user memory 语义召回（可降级）、以及默认关闭的 LiteLLM proxy 接入；并审计/回填 P0 task cards 的完成状态，避免路线图与实现状态漂移。

## Changes

- Add: Theme preference（renderer）支持 `data-theme="light"`，并持久化用户选择（禁止硬编码色值）。
- Add: `stats:getToday` / `stats:getRange`：返回稳定结构（包含 `summary`），并由编辑/保存/skill run 驱动更新。
- Add: `export:markdown`（以及 `export:pdf/docx` 的明确降级语义）：导出路径必须在 project 或 userData 固定目录内，且不得向 renderer 泄露绝对路径。
- Add: `memory:injection:preview(queryText)` semantic 模式（`user_memory_vec`），并在 sqlite-vec/embedding 不可用时 deterministic 回退且可观测。
- Add: `ai:proxy:settings:get/update/test`：proxy 默认关闭；开启时必须单链路；缺少 baseUrl 返回可断言 `INVALID_ARGUMENT`。

## Acceptance

- P1 task cards（`P1-001..P1-005`）均满足各自 Tests 要求（含 Windows E2E）。
- P0 task cards 状态与对应 merged PR 一致（Status/Completion 回填到位）。
- 所有新增 IPC 通道保持 `{ ok: true|false }` envelope，错误码稳定可测且无 silent failure。

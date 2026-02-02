# Proposal: issue-54-cnwb-p1-batch

## Why

完成 `creonow-v1-workbench` 的 P1 任务卡闭环：浅色主题、统计看板、导出、user memory 语义召回（可降级）与 LiteLLM proxy（默认关闭）。同时审计并修复 P0 任务卡的 Status/Completion 与已合并 PR 的不一致，避免路线图状态漂移。

## What Changes

- Docs: 审计并回填 P0 task cards 的 `Status/Acceptance/Completion`（以 merged PR + RUN_LOG 作为证据）。
- Theme: 补齐 `data-theme="light"` tokens，并提供无闪烁/可持久化的主题切换入口（renderer）。
- Analytics: 新增 stats DB schema + `stats:*` IPC + 最小 Analytics UI（今日/区间 summary）。
- Export: 新增 `export:*` IPC + markdown 导出最小实现（pdf/docx 明确降级），并接入命令面板。
- Memory: 为 `memory:injection:preview(queryText)` 增加 semantic 模式（`user_memory_vec`），并在 sqlite-vec/embedding 不可用时 deterministic 回退且可观测。
- Proxy: 新增 `ai:proxy:*` IPC + settings UI；proxy 默认关闭，开启时必须单链路且错误语义可断言。

## Impact

- Affected specs: `openspec/specs/creonow-v1-workbench/task_cards/index.md`、`openspec/specs/creonow-v1-workbench/task_cards/p0/*`、`openspec/specs/creonow-v1-workbench/task_cards/p1/*`、`openspec/specs/creonow-v1-workbench/design/04-context-engineering.md`、`openspec/specs/creonow-v1-workbench/design/05-memory-system.md`、`openspec/specs/creonow-v1-workbench/design/09-ai-runtime-and-network.md`
- Affected code: `apps/desktop/main/src/db/**`、`apps/desktop/main/src/ipc/**`、`apps/desktop/main/src/services/**`、`apps/desktop/renderer/src/**`、`apps/desktop/tests/**`
- Breaking change: NO（新增/可选字段与新增通道；保持现有行为可用）
- User benefit: 可切换浅色主题；可查看写作统计；可导出 markdown；记忆注入支持语义召回且可降级；可选 LiteLLM proxy 接入且错误可诊断。

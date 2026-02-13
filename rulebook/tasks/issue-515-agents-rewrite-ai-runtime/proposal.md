# Proposal: issue-515-agents-rewrite-ai-runtime

## Why

当前 `AGENTS.md` 的信息架构与表达方式不利于 Agent 执行（冗余、难回查、规则权重被稀释）。同时需要补齐与交付门禁相关的引用外部化与回查指针，并为 AI Service 运行时多轮上下文链路提供更稳定的回归测试。

## What Changes

- 按 `AGENTS撰写.md` 的设计原则重写 `AGENTS.md`（原则优先、结构清晰、避免重复、外部化引用）。
- 新增并落盘 `docs/references/*` 的可回查参考文档（tech stack / toolchain / testing / exception handling 等）。
- 更新 `docs/delivery-rule-mapping.md`，使其与新版 `AGENTS.md` 的章节引用一致。
- 为 AI Service 增加确定性的回归测试：缺失凭据时必须在发起网络请求前返回 `AI_PROVIDER_UNAVAILABLE`；以及流式/非流式多轮消息链路保持一致。

## Impact

- Affected specs:
  - None (governance / docs / tests only)
- Affected code:
  - `apps/desktop/main/src/services/ai/__tests__/*`
- Breaking change: NO
- User benefit: 更清晰的 Agent 宪法与交付回查路径，降低治理返工；增强 AI Service 运行时回归保护。

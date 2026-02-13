# Proposal: issue-505-p1p2-integration-check

## Why

P1（AI 可用）和 P2（Codex 上下文）共 13 个 change + 1 个 fix 已全部归档，在进入 P3（写作技能 + 编辑器）之前，需要对跨模块集成进行系统性验证，排查数据流断链、类型漂移、死代码等潜在问题，避免带病进入下一阶段。

## What Changes

- 新增 `docs/plans/p1p2-integration-check.md`，包含 12 个检查大项：端到端链路验证、Token 预算一致性、IPC 契约对齐、数据模型完整性、降级与错误处理、测试覆盖 gap 分析、dead code 发现、cross-module delta report。
- 文档已对照实际代码验证并修正关键断言。

## Impact

- Affected specs: 无（文档类任务）
- Affected code: 无（文档类任务）
- Breaking change: NO
- Key findings: `assembleSystemPrompt` 和 `GLOBAL_IDENTITY_PROMPT` 是死代码（未接入 LLM 调用路径）；P2 context/memory 注入已确认生效。

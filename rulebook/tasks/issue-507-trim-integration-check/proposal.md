# Proposal: issue-507-trim-integration-check

## Why

P1+P2 集成检查文档（`docs/plans/p1p2-integration-check.md`）内容过于冗长（533 行），大量已确认 PASS 的检查项仍保留完整 grep 命令和分析过程，对后续 Agent 阅读造成沉重上下文负担。同时缺少真实 LLM 集成测试指引，无法验证端到端链路的实际效果。

## What Changes

- 将已确认 PASS 的 6 大项压缩为 §0 单表汇总
- 移除所有已确认项的 grep 命令和详细分析
- 新增 §3「真实 LLM 集成测试（DeepSeek）」：环境配置、测试场景、streaming/non-streaming 灵活性、安全约束
- 重组剩余章节，文档从 533 行压缩至 183 行

## Impact

- Affected specs: 无（文档类任务）
- Affected code: 无（文档类任务）
- Breaking change: NO

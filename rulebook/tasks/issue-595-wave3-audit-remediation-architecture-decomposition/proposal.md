# Proposal: issue-595-wave3-audit-remediation-architecture-decomposition

## Why

Wave2 已合并，但审计报告中 Wave3 架构拆分层两项关键风险（`aud-h6b`、`aud-h6c`）仍未收口：memory/document 服务与 renderer shell 仍存在超大单体文件、跨职责混合与变更面过宽问题。若不在本轮完成受控拆分，会持续放大回归风险并削弱后续治理可维护性。

## What Changes

- `aud-h6b`：推进 memory/document 第二阶段拆分，抽离可独立验证的 helper/module 边界，保持行为契约不变。
- `aud-h6c`：推进 renderer shell 拆分，抽离 AppShell/AiPanel 的纯逻辑与展示辅助模块，降低单文件复杂度。
- 对两项 change 执行完整 TDD（Specification → TDD Mapping → Red → Green → Refactor）并落盘证据。

## Impact

- Affected specs:
  - `openspec/changes/aud-h6b-memory-document-decomposition/tasks.md`
  - `openspec/changes/aud-h6c-renderer-shell-decomposition/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/memory/**`
  - `apps/desktop/main/src/services/documents/**`
  - `apps/desktop/renderer/src/components/layout/**`
  - `apps/desktop/renderer/src/features/ai/**`
  - `apps/desktop/tests/**`（对应新增/调整测试）
- Breaking change: NO
- User benefit: 在不改变外部行为契约前提下，降低核心文件复杂度与回归面，提升后续迭代可维护性与审计可追踪性。

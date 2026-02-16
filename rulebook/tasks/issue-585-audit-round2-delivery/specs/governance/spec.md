## ADDED Requirements

### Requirement: 审计报告必须通过受治理交付进入主线

审计报告文档 MUST 通过 OpenSpec + Rulebook + GitHub 门禁链路交付，不得仅停留在本地未治理状态。

#### Scenario: 审计文档进入可追溯交付链路

- **Given** Issue `#585` 为 OPEN
- **When** 在 `task/585-audit-round2-delivery` 分支交付审计文档
- **Then** MUST 同步提供 Rulebook 工件与 RUN_LOG 证据
- **And** PR body MUST 包含 `Closes #585`

#### Scenario: 门禁全绿后才可声明完成

- **Given** 审计文档 PR 已创建
- **When** 进入收口阶段
- **Then** MUST 开启 auto-merge 并等待 `ci`、`openspec-log-guard`、`merge-serial` 全绿
- **And** 仅在 PR merged 且 `main` 已包含提交后才可声明完成

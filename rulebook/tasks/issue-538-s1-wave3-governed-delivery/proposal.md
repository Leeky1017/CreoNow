# Proposal: issue-538-s1-wave3-governed-delivery

## Why
需要将 `openspec/changes/EXECUTION_ORDER.md` 中 Wave 3 的三个服务提取 change（`s1-doc-service-extract`、`s1-ai-service-extract`、`s1-kg-service-extract`）一次性交付并完成主会话审计，确保文档/AI/KG 三个核心服务完成解耦，为后续 Sprint 2 演进提供稳定边界。

## What Changes
- 完成 `s1-doc-service-extract`：拆分 `documentService` 为 CRUD/version/branch 子服务并保持门面契约稳定。
- 完成 `s1-ai-service-extract`：提取 `runtimeConfig`/`errorMapper`/`providerResolver`，收敛 `aiService.ts` 为聚合门面。
- 完成 `s1-kg-service-extract`：拆分 KG query/write 子服务并保持关键导出与门面契约稳定。
- 补齐对应 Red/Green 测试、更新三个 change 的 `tasks.md`（含 Dependency Sync Check），归档完成 change 并同步 `EXECUTION_ORDER.md`。

## Impact
- Affected specs:
  - `openspec/changes/s1-doc-service-extract/**`
  - `openspec/changes/s1-ai-service-extract/**`
  - `openspec/changes/s1-kg-service-extract/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/documents/**`
  - `apps/desktop/main/src/services/ai/**`
  - `apps/desktop/main/src/services/kg/**`
  - `apps/desktop/tests/integration/**`
- Breaking change: NO
- User benefit: 服务职责边界更清晰、回归定位成本更低、后续功能迭代冲突面显著收敛。

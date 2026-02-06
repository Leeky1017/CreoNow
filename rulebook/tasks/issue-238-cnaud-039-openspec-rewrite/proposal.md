# Proposal: issue-238-cnaud-039-openspec-rewrite

## Why

现有审计重构稿已被明确判定为无效，需要基于当前代码实际状态重写为可执行 OpenSpec 资产，并确保 39 条问题映射、优先级分布和验证状态可追踪。

## What Changes

- 全量重写 `openspec/specs/creonow-audit-remediation/`。
- 重建 `CNAUD-REQ-001..039` 与审计 #1..#39 的一对一映射。
- 新增 6 份主题设计文档与 39 张任务卡（含 `verification_status`）。
- 纠正优先级分布为 P0=7、P1=17、P2=15。

## Impact

- Affected specs: `openspec/specs/creonow-audit-remediation/**`
- Affected code: 无业务代码改动（文档交付）
- Breaking change: NO
- User benefit: 获得可直接派发执行的标准化审计治理包，并明确哪些问题已过时或需复核。

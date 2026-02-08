# Proposal: issue-326-layer2-layer3-integration-gate

## Why
Layer2（Document Management）与 Layer3（KG/PM/MS）已完成分层开发，但缺少里程碑级集成门禁。当前缺口不是单点功能，而是跨模块契约（通道命名、响应 envelope、错误码基线）存在潜在漂移，若不统一做集成检查并落盘，后续 change 难以判断真实完成度。

## What Changes
- 新建并落地 `openspec/changes/issue-326-layer2-layer3-integration-gate/`，补齐 proposal/tasks/spec delta。
- 输出 `delta-report.md`，逐条标注 Implemented / Partial / Missing，并附证据路径。
- 补齐 `openspec/_ops/task_runs/ISSUE-326.md`，记录全量门禁结果与跨模块对齐差异。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，反映当前活跃 change 状态。

## Impact
- Affected specs:
  - `openspec/specs/cross-module-integration-spec.md`（通过 delta 扩展，不直接改主 spec）
  - `openspec/changes/issue-326-layer2-layer3-integration-gate/*`
- Affected code:
  - 运行时代码无改动（docs-only）
- Breaking change: NO
- User benefit: 获得可审计的里程碑集成门禁结果和可执行差异清单，避免“看似完成、实际漂移”。

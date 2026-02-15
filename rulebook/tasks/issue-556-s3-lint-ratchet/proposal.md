# Proposal: issue-556-s3-lint-ratchet

## Why

Sprint 3 需要把 lint 违规治理从“人工关注”升级为“自动阻断”。当前仓库缺少基线快照与 CI ratchet 比对，跨会话开发时无法稳定防止违规回升。

## What Changes

- 新增 `scripts/lint-ratchet.ts`，实现 baseline 读取校验、当前统计计算、回退判定与规则维度输出。
- 新增 `scripts/lint-baseline.json`，作为可版本化基线快照，包含 issue/reason 审计字段。
- 新增 `scripts/tests/lint-ratchet-*.test.ts`，覆盖 CMI-S3-LR-S1/S2/S3。
- 更新 `package.json` 与 `.github/workflows/ci.yml`，将 lint ratchet 接入统一 CI。
- 更新 `.eslintrc.cjs` 的 Sprint 3 治理规则（`complexity` / `max-lines-per-function`，warn）。

## Impact

- Affected specs:
  - `openspec/changes/s3-lint-ratchet/specs/cross-module-integration-delta.md`
- Affected code:
  - `scripts/lint-ratchet.ts`
  - `scripts/lint-baseline.json`
  - `scripts/tests/lint-ratchet-baseline.test.ts`
  - `scripts/tests/lint-ratchet-regression.test.ts`
  - `scripts/tests/lint-ratchet-cross-session-guard.test.ts`
  - `.github/workflows/ci.yml`
  - `package.json`
  - `.eslintrc.cjs`
- Breaking change: NO
- User benefit:
  - PR 阶段可自动阻断 lint 回退，且具备跨会话可追溯治理上下文。

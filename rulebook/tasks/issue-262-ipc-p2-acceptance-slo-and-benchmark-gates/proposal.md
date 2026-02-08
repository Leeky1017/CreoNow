# Proposal: issue-262-ipc-p2-acceptance-slo-and-benchmark-gates

## Why

IPC 主 spec 已定义 SLO 阈值（RR/Push/Validation），但缺少可执行 acceptance 基准与门禁。
没有自动化 gate 时，阈值是否达标只能依赖人工判断，无法形成稳定的回归保护。

## What Changes

- 新增 IPC acceptance 基准与门禁实现（统一采样、分位统计、阈值判定）。
- 新增四个 perf 测试覆盖 S1~S4（RR、Push、Validation、gate-fail）。
- 新增 `pnpm test:ipc:acceptance` 并接入 CI `ipc-acceptance` job。
- 在 RUN_LOG 中记录 Red 失败证据与 Green 通过证据，确保可追踪交付。

## Impact

- Affected specs:
  - `openspec/changes/ipc-p2-acceptance-slo-and-benchmark-gates/specs/ipc/spec.md`
  - `openspec/changes/ipc-p2-acceptance-slo-and-benchmark-gates/tasks.md`
- Affected code:
  - `apps/desktop/tests/perf/ipc-*.acceptance.spec.ts`
  - `scripts/ipc-acceptance-gate.ts`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `scripts/README.md`
- Breaking change: NO
- User benefit: IPC 阈值可执行、可回归、可在 CI 自动阻断不达标变更。

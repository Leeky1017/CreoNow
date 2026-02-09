# Proposal: issue-328-cross-module-contract-alignment-gate

## Why

issue-326 已确认跨模块契约存在命名与语义漂移，但当前只有人工巡检，缺乏自动阻断。需要将 cross-module 对齐规则固化为脚本门禁，避免后续 PR 在未登记漂移情况下进入 main。

## What Changes

- 新增 cross-module 契约基线文件（通道、错误码、envelope、批准漂移）。
- 新增 `scripts/cross-module-contract-gate.ts` 与 `pnpm cross-module:check`。
- 增加对应单元测试并纳入 `test:unit`。
- 将门禁接入 `.github/workflows/ci.yml` 与 `scripts/agent_pr_preflight.py`。
- 补齐 OpenSpec change 与 RUN_LOG 证据。

## Impact

- Affected specs:
  - `openspec/changes/issue-328-cross-module-contract-alignment-gate/*`
- Affected code:
  - `scripts/cross-module-contract-gate.ts`
  - `.github/workflows/ci.yml`
  - `scripts/agent_pr_preflight.py`
  - `package.json`
  - `apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
- Breaking change: NO（新增门禁，不改运行时对外 IPC 行为）
- User benefit: 后续任何跨模块契约漂移都能被脚本自动拦截并给出可定位修复信息。

# Proposal: issue-273-windows-e2e-startup-readiness

## Why

Windows CI 的 `windows-e2e` 在 PR #272 中出现 18 例失败与 1 例 flaky，失败集中在创建项目后的编辑器就绪等待与命令面板跨用例状态泄漏，必须通过 Spec-first + TDD 修复稳定性。

## What Changes

- 新增 OpenSpec change：`windows-e2e-startup-readiness`
- 引入共享 E2E helper，统一「创建项目后等待编辑器就绪」条件等待
- 修复 `command-palette.spec.ts` 用例隔离，确保无残留弹窗污染
- 完整记录 Red/Green 证据到 RUN_LOG

## Impact

- Affected specs:
  - `openspec/changes/windows-e2e-startup-readiness/specs/project-management/spec.md`
  - `openspec/changes/windows-e2e-startup-readiness/specs/workbench/spec.md`
- Affected code:
  - `apps/desktop/tests/e2e/**/*.spec.ts`（创建项目就绪路径）
  - `apps/desktop/tests/e2e/_helpers/*.ts`（新增）
- Breaking change: NO
- User benefit: Windows E2E 稳定通过，降低 CI 偶发失败与返工

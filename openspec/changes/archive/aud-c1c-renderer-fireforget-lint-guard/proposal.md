# 提案：aud-c1c-renderer-fireforget-lint-guard

## Why（问题与目标）

Renderer 存在裸 `void (async () => ...)()` 这类 fire-and-forget 入口时，若 promise reject 没有兜底，会导致：

- 错误被吞掉或只在控制台产生不可追踪的告警（silent failure）。
- 审计无法证明 “异步调用一定附带 rejection 处理” 的契约。

本 change 的目标是：为 renderer 统一 fire-and-forget 入口提供可复用 helper，并通过 lint guard 阻断裸入口，保证错误路径可观测、可回归。

## What（交付内容）

- 新增 renderer helper：`runFireAndForget(task, onError?)`
  - 默认错误处理必须记录可审计日志（避免 silent swallow）。
  - 允许调用方注入 `onError` 以实现业务侧可控处理。
- 增加 ESLint `no-restricted-syntax` 规则，阻断裸 `void (async () => ...)()` 入口。
- 新增回归测试：
  - `apps/desktop/tests/unit/renderer-fireforget-helper.spec.ts`
  - `apps/desktop/tests/unit/renderer-fireforget-lint-guard.spec.ts`

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c1c-renderer-fireforget-lint-guard/specs/workbench/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/renderer-fireforget-helper.spec.ts`
  - `apps/desktop/tests/unit/renderer-fireforget-lint-guard.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内引入新的异步调度框架（仅统一入口与 guard）。
- 不在本 change 内修改与 fire-and-forget 无关的业务逻辑。

## Evidence（可追溯证据）

- Wave2 RUN_LOG：`openspec/_ops/task_runs/ISSUE-593.md`
- Wave2 PR：https://github.com/Leeky1017/CreoNow/pull/594

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）

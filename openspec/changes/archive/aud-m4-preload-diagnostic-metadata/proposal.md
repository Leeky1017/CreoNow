# 提案：aud-m4-preload-diagnostic-metadata

## Why（问题与目标）

当 renderer 传入不可序列化 payload（例如包含 `BigInt`）时，preload gateway 必须拒绝调用并返回 `INVALID_ARGUMENT`。如果缺少可审计诊断元数据，会导致：

- 无法定位哪个字段触发序列化失败（排障成本高）。
- 若直接回传原始 payload 又存在敏感信息泄露风险。

本 change 的目标是：在返回 `INVALID_ARGUMENT` 时提供“安全且可审计”的诊断元数据（结构摘要 + 字段路径 + 原因码），既可定位问题又不泄露 payload 内容。

## What（交付内容）

- `INVALID_ARGUMENT` 必须包含：
  - `details.shape.rootType` / `details.shape.keyCount`（结构摘要）
  - `details.serializationIssue.path` / `details.serializationIssue.reason`（字段路径与原因）
- 新增/扩展回归测试：`apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - 覆盖 Scenario `IPC-AUD-M4-S1`（对应注释 S5）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-m4-preload-diagnostic-metadata/specs/ipc/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/ipc-preload-security.spec.ts`

## Out of Scope（不做什么）

- 不回传原始 payload 内容（仅返回安全摘要与路径）。
- 不在本 change 内调整 h5 的 payload size 策略（本 change 聚焦不可序列化诊断）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）

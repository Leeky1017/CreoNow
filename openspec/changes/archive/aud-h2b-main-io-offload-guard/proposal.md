# 提案：aud-h2b-main-io-offload-guard

## Why（问题与目标）

在 h2a 将 contextFs 热路径迁移为 async I/O 后，大文件读取仍需要明确的阈值策略与硬上限守卫，否则会出现：

- 大文件直接读入导致内存/延迟风险。
- 行为不确定：不同大小文件走不同路径但无可审计边界。

本 change 的目标是在 contextFs 读取路径中建立确定性的 `direct/stream` 阈值策略，并设置 stream 硬上限：超限必须返回可审计错误（含阈值 details），用最小测试锁定阈值边界与错误码。

## What（交付内容）

- `resolveContextFsReadStrategy(sizeBytes)` 必须按阈值确定性选择 `direct/stream`。
- stream 读取必须设置硬上限：超过 `CONTEXT_FS_STREAM_READ_HARD_LIMIT_BYTES` 返回确定性错误：
  - `code: "IO_ERROR"`
  - `message: "File exceeds stream read hard limit"`
  - `details: { limitBytes }`
- 新增回归测试：`apps/desktop/tests/unit/context/context-fs-offload-guard.test.ts`
  - 覆盖 Scenario `CE-AUD-H2B-S1..S2`（对应注释 H2B-S1/H2B-S2）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h2b-main-io-offload-guard/specs/context-engine/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/context/context-fs-offload-guard.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内引入新的 worker 体系（仅定义阈值策略与守卫边界）。
- 不在本 change 内改变 IPC payload schema（仅约束 contextFs 读取行为）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）

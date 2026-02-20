# 提案：aud-h2a-main-hotpath-async-io

## Why（问题与目标）

主进程热路径若直接执行同步文件 I/O（read/write/stat/readdir），会引发：

- event loop 被阻塞，导致 UI 卡顿与不可预测延迟。
- 审计难以证明“IPC 热路径不包含同步 I/O”。

本 change 的目标是将 contextFs 的关键文件操作迁移为 async 变体，并保证 IPC handler 热路径只调用 async 变体，从而消除同步 I/O 风险点。

## What（交付内容）

- contextFs 暴露 async 变体（确保目录、查询状态、列表、读取文本）并返回稳定 envelope。
- IPC `contextFs` handler 必须调用 async 变体，不得直接调用 sync 版本。
- 新增回归测试：
  - `apps/desktop/tests/unit/context/context-fs-async-io.test.ts`
  - `apps/desktop/tests/unit/context/context-fs-ipc-async-hotpath.guard.test.ts`

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h2a-main-hotpath-async-io/specs/context-engine/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/context/context-fs-async-io.test.ts`
  - `apps/desktop/tests/unit/context/context-fs-ipc-async-hotpath.guard.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内引入新的 IPC channel 或改变 payload schema（仅替换热路径实现策略）。
- 不在本 change 内定义大文件读取的阈值策略（阈值与 offload guard 在后续 h2b 收敛）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）

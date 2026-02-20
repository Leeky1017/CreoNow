# 提案：aud-h1-export-stream-write

## Why（问题与目标）

Project bundle 导出若将所有 section 先拼接为单个大字符串（例如 `sections.join(...)`）再一次性写入，会导致：

- 内存峰值不可控（大项目导出时风险更高）。
- 导出路径难以用静态证据证明“不会 materialize join buffer”。

本 change 的目标是把导出写入改为流式写入（write-through），并用最小 guard test 锁定“必须使用 stream API、不得 join”。

## What（交付内容）

- `exportProjectBundle` 写入路径改为 stream 写入（使用 `createWriteStream(...)`）。
- 禁止在导出过程中对 `sections` 做 `join` 拼接。
- 新增回归测试：`apps/desktop/main/src/services/export/__tests__/export-project-bundle-streaming.guard.test.ts`
  - 覆盖 Scenario `DOC-AUD-H1-S1`（对应注释 S1）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h1-export-stream-write/specs/document-management/spec.md`
- Tests（evidence）:
  - `apps/desktop/main/src/services/export/__tests__/export-project-bundle-streaming.guard.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内重构导出格式或打包协议（仅约束写入策略）。
- 不在本 change 内引入新的导出 UI 能力（仅修复导出实现的审计风险点）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）

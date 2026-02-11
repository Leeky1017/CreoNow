# Proposal: issue-412-version-control-p2-diff-rollback

## Why

`openspec/changes/version-control-p2-diff-rollback` 定义了 Version Control P2 的核心闭环：历史版本对比与安全回滚。当前代码仍依赖 `version:snapshot:read/restore` 进行本地比较和旧式恢复，缺少 `version:snapshot:diff` 与 `version:snapshot:rollback` 契约，也未落实回滚三步语义（`pre-rollback -> set current -> rollback`）。若不完成该 change，后续 `version-control-p3` 分支合并与冲突解决将缺少稳定 Diff/回滚基线。

## What Changes

- 基于 TDD 完成 `version-control-p2-diff-rollback` 的 5 个 Scenario。
- 扩展 IPC contract：新增 `version:snapshot:diff`、`version:snapshot:rollback` 请求/响应 schema，并重新生成 shared IPC types。
- 后端实现：
  - `version:snapshot:diff` 计算两个版本（或历史版本与当前文档）的 unified diff 与统计；
  - `version:snapshot:rollback` 执行事务化三步回滚（先写 `pre-rollback` 快照，再写当前文档为目标版本内容，再写 `rollback` 快照）。
- 前端实现：
  - 版本对比改为调用 `version:snapshot:diff`；
  - 恢复动作改为调用 `version:snapshot:rollback`；
  - 两版本无差异时展示无差异态；
  - 开启 `creonow.editor.showAiMarks` 时，Diff 中 AI 修改以虚线下划线标识。
- 完成 RUN_LOG、preflight、required checks、auto-merge、main 收口与 cleanup。

## Impact

- Affected specs:
  - `openspec/changes/version-control-p2-diff-rollback/proposal.md`
  - `openspec/changes/version-control-p2-diff-rollback/tasks.md`
  - `openspec/changes/version-control-p2-diff-rollback/specs/version-control-delta.md`
- Affected code:
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/main/src/ipc/version.ts`
  - `apps/desktop/main/src/services/documents/documentService.ts`
  - `apps/desktop/renderer/src/features/version-history/useVersionCompare.ts`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/features/diff/{DiffView.tsx,SplitDiffView.tsx,DiffViewPanel.tsx}`
  - `apps/desktop/renderer/src/**/*.test.{ts,tsx}`
  - `apps/desktop/tests/unit/**/*.test.ts`
- Breaking change: NO（新增通道并迁移调用链，不改变主流程入口）
- User benefit: 用户可获得可追溯的版本 Diff 与可撤销的安全回滚，避免覆盖历史与误恢复不可逆。

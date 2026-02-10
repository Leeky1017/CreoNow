# Proposal: issue-394-version-control-p0-snapshot-history

## Why

`openspec/changes/version-control-p0-snapshot-history` 已定义 P0 快照与版本历史基线，但当前实现与 change 规范存在明显漂移：缺少 `version:snapshot:create` 通道、自动保存未按 5 分钟窗口合并、AI/状态变更 reason 语义未对齐、版本历史入口不足（右键/Info/命令面板）。若不先完成该 change，会阻断 version-control p1/p2/p3 的规范化交付，并造成后续 Diff/回滚/分支能力基于不稳定上游实现。

## What Changes

- 以 TDD 方式完成该 change 的 5 个 Scenario（手动保存、AI 接受、autosave 合并、打开版本历史、actor 标识）。
- 补齐 `version:snapshot:create` IPC 通道，并统一 `manual-save` / `autosave` / `ai-accept` / `status-change` 映射。
- 在快照模型中补齐 `wordCount`，并在列表输出中支持字数变化计算基础字段。
- 落地 autosave 5 分钟窗口合并策略（保留最新内容，手动/AI 快照不参与合并）。
- 补齐版本历史入口（文件右键、Info 面板链接、命令面板命令）与 Storybook 场景校验。
- 完成 RUN_LOG、preflight、required checks、PR auto-merge、main 收口与 change/archive 同步。

## Impact

- Affected specs:
  - `openspec/changes/version-control-p0-snapshot-history/proposal.md`
  - `openspec/changes/version-control-p0-snapshot-history/tasks.md`
  - `openspec/changes/version-control-p0-snapshot-history/specs/version-control-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/documents/documentService.ts`
  - `apps/desktop/main/src/ipc/version.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/db/migrations/*`（如需新增迁移）
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/stores/aiStore.ts`
  - `apps/desktop/renderer/src/features/version-history/**`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/tests/**`（对应 Scenario 测试）
- Breaking change: NO
- User benefit: 版本快照/历史能力与 OpenSpec 对齐，形成可验证且可扩展的 P0 基线，后续 p1~p4 可直接在一致契约上推进。

## 1. Implementation
- [ ] 1.1 移除 `apps/desktop/storybook-static/` 构建产物的 git 跟踪，并在 `.gitignore` 中忽略
- [ ] 1.2 `Button`/`ListItem` 改为 `forwardRef`，确保 Radix `asChild` 触发器无 ref 告警
- [ ] 1.3 新增 `ContextMenu` primitive（Radix ContextMenu 封装）
- [ ] 1.4 `FileTreePanel`：
  - [ ] 1.4.1 Rename 输入框不溢出（`min-w-0` + `overflow-hidden` + 按钮不撑开）
  - [ ] 1.4.2 Rename/Delete 通过右键菜单与 `⋯` 菜单提供
  - [ ] 1.4.3 Story 里可稳定复现 Rename（`initialRenameDocumentId`）用于浏览器验收
- [ ] 1.5 Phase 4 面板组件 Story/Test 移除 `@ts-nocheck` 并补齐类型

## 2. Testing
- [ ] 2.1 `pnpm typecheck`
- [ ] 2.2 `pnpm lint`
- [ ] 2.3 `pnpm test:run`
- [ ] 2.4 `pnpm storybook:build`
- [ ] 2.5 Browser：验证 `FileTreePanel/RenameDemo` 输入框无溢出，且 `⋯` 菜单可点开

## 3. Documentation
- [ ] 3.1 追加 `openspec/_ops/task_runs/ISSUE-101.md` Runs（仅追加不回写）

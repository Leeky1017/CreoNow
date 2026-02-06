## 1. Data and Contract

- [x] 1.1 增加 `0010_projects_archive.sql` 并在 DB init 注册。
- [x] 1.2 在 `ipc-contract.ts` 增加 `project:rename/duplicate/archive`，并将 `project:list` 改为 `includeArchived`。
- [x] 1.3 运行 `pnpm contract:generate` 并提交 `ipc-generated.ts`。

## 2. Main Process

- [x] 2.1 在 `projectService.ts` 实现 rename/duplicate/archive/unarchive。
- [x] 2.2 在 `ipc/project.ts` 注册新 handler，并保持 `{ ok: true|false }` 返回。

## 3. Renderer

- [x] 3.1 在 `projectStore.tsx` 增加 `renameProject/duplicateProject/setProjectArchived` action。
- [x] 3.2 在 Dashboard 接入 RenameDialog、Duplicate、Archive/Unarchive。
- [x] 3.3 默认隐藏 archived，并提供可展开 Archived 分组及 unarchive 入口。

## 4. Tests and Verification

- [x] 4.1 新增 `projectService.projectActions.test.ts`。
- [x] 4.2 新增 `dashboard-project-actions.spec.ts`。
- [x] 4.3 更新受影响 stories/tests 的 ProjectStore mock 以通过类型检查。
- [x] 4.4 通过 `typecheck/lint/contract:check/test:unit/test:integration/apps-desktop-vitest`。
- [ ] 4.5 通过关键 e2e（当前被 Electron/Playwright 启动参数兼容问题阻塞，已记录）。

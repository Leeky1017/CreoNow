# Proposal: issue-583-windows-e2e-create-dialog-regression

## Why

Windows E2E 在 bundled Electron 运行时触发项目创建回归：内置模板目录未被打包进
`dist/main`，`project:create` 提交后模板加载失败，创建对话框保持可见，导致
`waitForEditorReady` 超时并引发多用例连锁失败。

## What Changes

- 构建阶段将 `apps/desktop/main/templates/project` 复制到
  `apps/desktop/dist/main/templates/project`，保证 bundled runtime 可读取内置模板。
- 新增构建配置回归测试，锁定“主进程构建必须包含模板复制插件”契约。
- 更新模板目录解析回归测试期望，明确 bundled 产物优先于源码目录回退。
- 补齐治理交付文档（Rulebook + RUN_LOG），记录根因、修复迭代与验证证据。

## Impact

- Affected specs:
  - `openspec/specs/project-management/spec.md`（沿用既有“项目创建 + 模板”契约）
  - `openspec/specs/workbench/spec.md`（沿用既有“创建后进入编辑态”E2E 观察点）
- Affected code:
  - `apps/desktop/electron.vite.config.ts`
  - `apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
  - `apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
  - `openspec/_ops/task_runs/ISSUE-583.md`
  - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/**`
- Breaking change: NO
- User benefit: bundled Windows 运行时可稳定加载内置模板，项目创建提交后对话框可关闭并进入编辑器，恢复 windows-e2e 稳定性。

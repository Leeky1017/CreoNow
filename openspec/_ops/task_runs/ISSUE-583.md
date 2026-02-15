# ISSUE-583

- Issue: #583
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/583
- Branch: `task/583-windows-e2e-create-dialog-regression`
- PR: https://github.com/Leeky1017/CreoNow/pull/584
- Scope (Functional):
  - `apps/desktop/main/src/services/projects/templateService.ts`
  - `apps/desktop/electron.vite.config.ts`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.test.tsx`
  - `apps/desktop/main/src/services/projects/__tests__/template-builtin-dir-invalid-argument.test.ts`
  - `apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
  - `apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
- Scope (Governance):
  - `openspec/_ops/task_runs/ISSUE-583.md`
  - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/.metadata.json`
  - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/proposal.md`
  - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/specs/governance/spec.md`
  - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/tasks.md`
- Out of Scope:
  - 新增/删除内置模板能力（W3 模板功能保持）
  - PR 创建、auto-merge、main 收口（本日志版本尚未执行）

## Plan

- [x] 捕获 windows-e2e 失败根因并形成可复现证据
- [x] 接收并整合 3 个功能补丁提交（create-dialog、templateService、build copy）
- [x] 保持结构化失败路径（模板目录不可用时返回 `INVALID_ARGUMENT`）
- [x] 完成主会话最新验证证据（unit/vitest/build/playwright 单测）
- [x] 补齐并校准 Rulebook + RUN_LOG 治理文件
- [x] 创建 PR 并回填 PR 链接
- [ ] 开启 auto-merge 并等待 required checks 全绿
- [ ] 合并回 `main`、同步控制面、清理 worktree、归档 Rulebook task

## Delivery Checklist

- [x] Scope 已与当前分支真实改动对齐
- [x] 已记录 accepted commits（4 个）
- [x] 已记录主会话最新验证证据
- [x] PR 已创建（当前：https://github.com/Leeky1017/CreoNow/pull/584）
- [ ] Auto-merge 已开启（当前：未开启）
- [ ] Required checks 全绿（当前：未触发）
- [ ] 已合并至 `main`（当前：未合并）

## Runs

### 2026-02-15 Root-Cause Capture（windows-e2e create dialog 未关闭）

- Command:
  - `sed -n '1,260p' apps/desktop/main/src/services/projects/templateService.ts`
  - `rg -n "templates/project" apps/desktop/dist/main/index.js`
  - `ls -la apps/desktop/dist/main`
  - `sed -n '1,200p' apps/desktop/tests/e2e/_helpers/projectReadiness.ts`
- Exit code: `0`
- Key output:
  - bundled 主进程存在模板目录解析逻辑，但 `dist/main` 初始缺少 `templates/project` 产物。
  - `waitForEditorReady` 首先等待 `create-project-dialog` hidden，模板加载失败会导致提交后对话框停留。
- Conclusion:
  - 根因为 bundled runtime 内置模板资源缺失，触发 create flow 卡住并放大为 windows-e2e 连锁失败。

### 2026-02-15 Accepted Patch Commits（当前分支真实链路）

- `bae420edc30483fa15cf0da5ba84ec0a5501631a`
  - Message: `fix: restore create-project default template sync for e2e readiness (#583)`
  - Files:
    - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`
    - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.test.tsx`
- `28a4012f4185af91d8388012b9b4ffe0e224b29a`
  - Message: `fix: make builtin template loading robust in bundled runtime (#583)`
  - Files:
    - `apps/desktop/main/src/services/projects/templateService.ts`
    - `apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
    - `apps/desktop/main/src/services/projects/__tests__/template-builtin-dir-invalid-argument.test.ts`
- `84637469d474784e6001522399cdb4cea07c9ed7`
  - Message: `fix: resolve builtin template path for bundled runtime (#583)`
  - Files:
    - `apps/desktop/electron.vite.config.ts`
    - `apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
    - `apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
- `2b98c1741234aabeb525791b6e3fabd3e6ca0937`
  - Message: `docs: add governance artifacts for issue-583 (#583)`
  - Files:
    - `openspec/_ops/task_runs/ISSUE-583.md`
    - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/**`

### 2026-02-15 Main-Session Verification（Latest Audit Commands）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
  - `pnpm --filter @creonow/desktop rebuild better-sqlite3`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-builtin-dir-invalid-argument.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/projects/CreateProjectDialog.test.tsx`
  - `pnpm --filter @creonow/desktop build`
  - `ls -1 apps/desktop/dist/main/templates/project`
  - `pnpm --filter @creonow/desktop rebuild:native`
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/ai-apply.spec.ts --grep "ai apply: success path writes actor=ai version \+ main.log evidence"`
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/version-history.spec.ts --grep "version:snapshot:read returns full version content"`
- Exit code: `0`
- Key output:
  - `CreateProjectDialog.test.tsx`: `22 passed`.
  - build 成功，且 `dist/main/templates/project` 包含：`custom.json`、`novel.json`、`screenplay.json`、`short-story.json`。
  - Playwright 单测通过：
    - `ai-apply.spec.ts` success path: `1 passed`
    - `version-history.spec.ts` full content path: `1 passed`

### 2026-02-15 PR Creation

- Command:
  - `gh pr create --base main --head task/583-windows-e2e-create-dialog-regression --title "Fix bundled template loading regression after W3 (#583)" --body-file /tmp/pr-583-body.md`
- Exit code: `0`
- Key output:
  - PR: `https://github.com/Leeky1017/CreoNow/pull/584`

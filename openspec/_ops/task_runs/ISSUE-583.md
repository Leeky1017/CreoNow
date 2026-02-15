# ISSUE-583

- Issue: #583
- Issue URL: `<fill-issue-url>`
- Branch: `task/583-windows-e2e-create-dialog-regression`
- PR: `<fill-pr-url-after-create>`
- Scope:
  - `apps/desktop/electron.vite.config.ts`
  - `apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
  - `apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
  - `rulebook/tasks/issue-583-windows-e2e-create-dialog-regression/**`
  - `openspec/_ops/task_runs/ISSUE-583.md`
- Out of Scope:
  - 新增/删除模板功能（W3 内置模板语义不变）
  - PR 创建与合并收口（本日志阶段尚未执行）

## Plan

- [x] 捕获 windows-e2e 失败根因并形成可复现证据
- [x] 以最小补丁修复 bundled runtime 内置模板加载
- [x] 保持结构化失败路径（模板目录不可用时返回 `INVALID_ARGUMENT`，无未捕获 fs throw）
- [x] 完成聚焦验证（模板相关测试 + build 产物检查）
- [x] 补齐 Rulebook 与 RUN_LOG 治理文件
- [ ] 创建 PR 并回填 issue/pr 占位符为真实链接
- [ ] 开启 auto-merge 并等待 required checks 全绿
- [ ] 合并回 `main`、同步控制面、清理 worktree、归档 Rulebook task

## Delivery Checklist

- [x] 根因证据已记录（路径解析偏移 + dist 产物缺失）
- [x] 修复补丁已提交到当前任务分支
- [x] 聚焦验证已通过（见 Runs）
- [x] Rulebook 治理文件已创建并对齐当前状态
- [ ] PR 已创建（当前：未创建）
- [ ] Auto-merge 已开启（当前：未开启）
- [ ] Required checks 全绿（当前：未触发）
- [ ] 已合并至 `main`（当前：未合并）

## Runs

### 2026-02-15 Root-Cause Capture（windows-e2e create dialog 卡住）

- Command:
  - `sed -n '1,260p' apps/desktop/main/src/services/projects/templateService.ts`
  - `rg -n "templates/project" apps/desktop/dist/main/index.js`
  - `ls -la apps/desktop/dist/main`
  - `sed -n '1,200p' apps/desktop/tests/e2e/_helpers/projectReadiness.ts`
- Exit code: `0`
- Key output:
  - `templateService` 在 bundled 主进程仍走 `../../../templates/project` 相关路径解析。
  - `dist/main/index.js` 可见模板目录解析逻辑，但构建产物目录仅有 `index.js` 与 `skills/`，缺少 `templates/project/`。
  - `waitForEditorReady` 首先断言 `create-project-dialog` 变为 hidden；模板加载失败会阻断创建闭环并导致该等待超时。
- Conclusion:
  - 根因为 bundled runtime 缺少内置模板资源，导致项目创建提交后模板加载失败，create dialog 不关闭。

### 2026-02-15 Subagent Patch Iteration #1（最小补丁落地）

- Command:
  - 编辑 `apps/desktop/electron.vite.config.ts`：新增 `creonow-copy-builtin-project-templates` 插件
  - 新增 `apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-builtin-dir-invalid-argument.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
- Exit code:
  - 配置回归测试：`0`
  - 两个模板服务脚本测试：`1`（`better-sqlite3` Node ABI mismatch）
- Key output:
  - 新插件已注入 `main.plugins`。
  - `ERR_DLOPEN_FAILED`: `better_sqlite3.node` `NODE_MODULE_VERSION` 不匹配（143 vs 115）。

### 2026-02-15 Subagent Patch Iteration #2（环境修复 + 测试期望修正）

- Command:
  - `pnpm --filter @creonow/desktop rebuild better-sqlite3`
  - 复跑两个模板服务脚本测试
  - 复跑 `template-runtime-resolution.test.ts`
  - 编辑 `apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`（改为 `dist/main/templates/project` 优先，源码目录回退）
- Exit code:
  - native rebuild：`0`
  - 模板服务脚本测试：`0`
  - `template-runtime-resolution.test.ts` 首次复跑：`1`（旧断言仍固定期望 `main/templates/project`）
  - 修正断言后复跑：`0`
- Key output:
  - 当前真实行为为 bundled 目录优先命中，符合修复目标。

### 2026-02-15 Verification Commands And Results

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/config/main-build-plugins.runtime.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-runtime-resolution.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-builtin-dir-invalid-argument.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
  - `pnpm --filter @creonow/desktop build`
  - `ls apps/desktop/dist/main/templates/project`
- Exit code: `0`
- Key output:
  - 聚焦测试全部通过。
  - 构建后模板产物存在：`custom.json`、`novel.json`、`screenplay.json`、`short-story.json`。

### 2026-02-15 Commit（功能修复）

- Command:
  - `git commit -m "fix: resolve builtin template path for bundled runtime (#583)"`
- Exit code: `0`
- Key output:
  - Commit: `84637469d474784e6001522399cdb4cea07c9ed7`

## 1. Implementation
- [x] 1.1 捕获 bundled runtime 模板加载根因并落盘（路径解析 + 打包产物缺失）
- [x] 1.2 修复 create-dialog 默认模板同步回归，恢复创建提交流程可达（`bae420ed...`）
- [x] 1.3 强化内置模板目录解析与错误处理，保留 W3 能力且返回结构化失败（`28a4012f...`）
- [x] 1.4 修复 bundled 构建资源落盘：复制内置模板到 `dist/main/templates/project`（`84637469...`）

## 2. Testing
- [x] 2.1 通过模板目录/运行时回归测试（`main-build-plugins`、`template-runtime-resolution`）
- [x] 2.2 通过模板服务聚焦测试（`template-builtin-dir-invalid-argument`、`template-service-apply`）
- [x] 2.3 通过 `CreateProjectDialog` 相关 Vitest 回归（22 tests）
- [x] 2.4 通过 `pnpm --filter @creonow/desktop build` 并确认 `dist/main/templates/project/*.json` 存在
- [x] 2.5 在 `rebuild:native` 后通过 Playwright 单测：
  - `ai-apply.spec.ts`（success path）
  - `version-history.spec.ts`（full version content）

## 3. Governance
- [x] 3.1 创建 Rulebook 治理文件：`.metadata.json`、`proposal.md`、`specs/governance/spec.md`、`tasks.md`
- [x] 3.2 创建并对齐 `openspec/_ops/task_runs/ISSUE-583.md`（Scope/accepted commits/verification evidence）
- [ ] 3.3 创建 PR（`Closes #583`）并回填 RUN_LOG issue/pr 占位符为真实链接
- [ ] 3.4 开启 auto-merge，等待 required checks（`ci`/`openspec-log-guard`/`merge-serial`）全绿
- [ ] 3.5 合并后执行控制面 `main` 同步、worktree 清理、Rulebook 归档

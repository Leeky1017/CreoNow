## 1. Implementation
- [x] 1.1 捕获 bundled runtime 模板加载根因并落盘（路径解析 + 打包产物缺失）
- [x] 1.2 最小修复构建流程：复制内置模板到 `dist/main/templates/project`
- [x] 1.3 保留 W3 内置模板能力并确保失败路径返回结构化错误（无未捕获 fs throw）
- [x] 1.4 提交功能修复 commit：`fix: resolve builtin template path for bundled runtime (#583)`

## 2. Testing
- [x] 2.1 新增并通过构建配置回归测试（模板复制插件必须存在）
- [x] 2.2 通过模板目录解析回归测试（bundled 优先，source 回退）
- [x] 2.3 通过模板服务聚焦测试（invalid-dir、template-apply）
- [x] 2.4 通过 `pnpm --filter @creonow/desktop build` 并确认 `dist/main/templates/project/*.json` 存在

## 3. Governance
- [x] 3.1 创建 Rulebook 治理文件：`.metadata.json`、`proposal.md`、`specs/governance/spec.md`、`tasks.md`
- [x] 3.2 创建 `openspec/_ops/task_runs/ISSUE-583.md` 并记录根因、补丁迭代、验证证据
- [ ] 3.3 创建 PR（`Closes #583`）并回填 RUN_LOG issue/pr 占位符为真实链接
- [ ] 3.4 开启 auto-merge，等待 required checks（`ci`/`openspec-log-guard`/`merge-serial`）全绿
- [ ] 3.5 合并后执行控制面 `main` 同步、worktree 清理、Rulebook 归档

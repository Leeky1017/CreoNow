## 1. Implementation

- [x] 1.1 新建 OPEN Issue #296 与 `task/296-change-dependency-sync-governance` worktree
- [x] 1.2 更新 AGENTS 与 delivery 主规则，增加 Dependency Sync Check 硬约束
- [x] 1.3 更新 OpenSpec change 模板与 EXECUTION_ORDER 维护规则
- [x] 1.4 更新 preflight 校验规则，要求变更中的 change tasks 包含依赖同步检查文案
- [x] 1.5 更新当前串行链 change tasks（Memory / Project Management）

## 2. Testing

- [x] 2.1 运行 `rulebook task validate issue-296-change-dependency-sync-governance`
- [x] 2.2 运行 `pnpm exec prettier --check` 校验改动文件格式
- [x] 2.3 运行 `python3 scripts/agent_pr_preflight.py` 完整预检

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-296.md` 记录命令与结果
- [x] 3.2 在 RUN_LOG 中记录依赖同步治理更新范围与证据

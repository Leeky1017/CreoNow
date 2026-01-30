# ISSUE-1

- Issue: #1
- Branch: task/1-design-skeleton
- PR: <fill-after-created>

## Plan

- 创建 Monorepo 目录结构
- 迁移 Variant/ 设计资产（替换 WriteNow -> CreoNow）
- 复制 agent 脚本从 SS 仓库
- 重写 AGENTS.md
- 配置 CI 工作流

## Runs

### 2026-01-30 20:19 初始化项目骨架

- Command: `mkdir -p apps/desktop/main apps/desktop/renderer packages/shared/types ...`
- Key output: 目录结构创建成功
- Evidence: `ls -la` 显示所有目录已创建

### 2026-01-30 20:19 创建配置文件

- Command: 创建 package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore
- Key output: 配置文件创建成功
- Evidence: 文件已写入 worktree

### 2026-01-30 20:20 迁移设计资产

- Command: `cp -r WriteNow/Variant/* design/Variant/ && sed -i 's/WriteNow/CreoNow/g'`
- Key output: 设计资产迁移成功，WriteNow 已替换为 CreoNow
- Evidence: `design/Variant/DESIGN_SPEC.md` + 10 个 HTML 设计稿

### 2026-01-30 20:21 复制 agent 脚本

- Command: `cp SS/scripts/agent_*.sh scripts/`
- Key output: 5 个 agent 脚本已复制
- Evidence: `scripts/agent_*.sh`

### 2026-01-30 20:21 创建 AGENTS.md

- Command: 创建 AGENTS.md
- Key output: AGENTS.md 已创建，包含工程规则和 openspec-rulebook-github-delivery 引用
- Evidence: `/AGENTS.md`

### 2026-01-30 20:22 创建 CI 工作流

- Command: 创建 .github/workflows/ci.yml 和 merge-serial.yml
- Key output: CI 工作流已创建
- Evidence: `.github/workflows/`

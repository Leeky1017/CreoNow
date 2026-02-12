# ISSUE-433

- Issue: #433
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/433
- Branch: task/433-p5-workbench-change-specs
- PR: https://github.com/Leeky1017/CreoNow/pull/434

## Plan

1. 基于 P5-WORKBENCH-ANALYSIS.md 和 workbench/spec.md 创建 6 个 change 三件套
2. 更新 EXECUTION_ORDER.md
3. 双重验证（Spec 覆盖矩阵 + 跨 change 一致性）
4. 创建 Rulebook task、RUN_LOG，提交并合并到 main

## Runs

### Run 1: 创建 6 个 change 三件套 + EXECUTION_ORDER 更新

**输入**：基于 `docs/P5-WORKBENCH-ANALYSIS.md` 分析和 `openspec/specs/workbench/spec.md` 规范

**产出**：
- `openspec/changes/workbench-p5-00-contract-sync/` (proposal.md, specs/workbench-delta.md, tasks.md)
- `openspec/changes/workbench-p5-01-layout-iconbar-shell/` (proposal.md, specs/workbench-delta.md, tasks.md)
- `openspec/changes/workbench-p5-02-project-switcher/` (proposal.md, specs/workbench-delta.md, tasks.md)
- `openspec/changes/workbench-p5-03-rightpanel-statusbar/` (proposal.md, specs/workbench-delta.md, tasks.md)
- `openspec/changes/workbench-p5-04-command-palette/` (proposal.md, specs/workbench-delta.md, tasks.md)
- `openspec/changes/workbench-p5-05-hardening-gate/` (proposal.md, specs/workbench-delta.md, tasks.md)
- `openspec/changes/EXECUTION_ORDER.md` 更新为 6 个活跃 change

**验证**：
- Pass 1: 逐文件审阅 18 个文件（6 change × 3 文件），确认结构完整
- Pass 2: 交叉核对 Spec 覆盖矩阵 17 项全覆盖、依赖链一致、IPC 通道名/tab 类型/IconBar 列表跨 change 一致

### Run 2: Rulebook task 创建

**产出**：`rulebook/tasks/issue-433-p5-workbench-change-specs/` (.metadata.json, proposal.md, tasks.md)

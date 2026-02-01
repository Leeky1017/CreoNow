# ISSUE-77

- Issue: #77
- Branch: task/77-design-decisions-layout
- PR: <fill-after-created>

## Plan

- 修正 DESIGN_DECISIONS.md 中 4 处问题：浅色主题优先级、布局高度约束、滚动行为规范、按钮状态矩阵

## Runs

### 2026-02-01 修改 DESIGN_DECISIONS.md

- Command: `StrReplace` (4 次)
- Key output:
  - 浅色主题优先级改为 P1+（第 1039 行）
  - 新增 §1.4 布局高度分配（第 54 行）
  - 新增 §2.6 滚动行为（第 136 行）
  - 按钮状态改为状态矩阵表格（第 517 行）
- Evidence: `design/DESIGN_DECISIONS.md` 行数从 1089 增加到 1169（+80 行）

### 2026-02-01 验证修改

- Command: `grep -E "### 1\.4|### 2\.6|浅色主题 \(P1|状态矩阵" design/DESIGN_DECISIONS.md`
- Key output: 4 处修改全部匹配

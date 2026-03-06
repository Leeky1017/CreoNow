# Active Changes Execution Order

更新时间：2026-03-06 23:30

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **5**。
- 执行模式：并行推进（互不依赖的变更可并行进入 Red）。
- 规则：新 change 启动前，需先在本文件登记顺序与依赖，再进入 Red。

## 执行顺序

1. `a0-01-zen-mode-editable`
2. `a0-04-export-honest-grading`
3. `a0-05-skill-router-negation-guard`
4. `a0-10-search-mvp`
5. `a0-12-inline-ai-baseline`

## 本次同步说明（Phase 0 全量登记）

- `a0-01-zen-mode-editable`：对应 Issue #986，禅模式行为变更。
- `a0-04-export-honest-grading`：对应 Issue #1002，导出 spec 修正。
- `a0-05-skill-router-negation-guard`：对应 Issue #987，Skill Router 否定守卫。
- `a0-10-search-mvp`：对应 Issue #1003，搜索快捷键与发现性。
- `a0-12-inline-ai-baseline`：对应 Issue #1004，Inline AI 从 0 到 1。

## 依赖说明

- `a0-01-zen-mode-editable`：无上游依赖。
- `a0-04-export-honest-grading`：无上游依赖，可与所有其他 change 并行。
- `a0-05-skill-router-negation-guard`：无上游依赖，可并行。
- `a0-10-search-mvp`：无上游依赖，可并行。
- `a0-12-inline-ai-baseline`：依赖 `a0-01-zen-mode-editable` 完成后启动。

## 依赖拓扑

```text
a0-01-zen-mode-editable ──→ a0-12-inline-ai-baseline
a0-04-export-honest-grading
a0-05-skill-router-negation-guard
a0-10-search-mvp
```

# Active Changes Execution Order

更新时间：2026-02-12 19:18

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**。
- Workbench P5 全部 6 个 change（00–05）已归档完成。
- change 05 经审计修复（ISSUE-454）后重新归档。
- 已归档完成：
  - `openspec/changes/archive/workbench-p5-00-contract-sync`
  - `openspec/changes/archive/workbench-p5-01-layout-iconbar-shell`
  - `openspec/changes/archive/workbench-p5-02-project-switcher`
  - `openspec/changes/archive/workbench-p5-03-rightpanel-statusbar`
  - `openspec/changes/archive/workbench-p5-04-command-palette`
  - `openspec/changes/archive/workbench-p5-05-hardening-gate`

## 执行顺序

无活跃 change。

## 维护规则

- 当活跃 change 数量达到 2 个及以上时，需恢复多泳道顺序定义。
- 未同步本文件时，不得宣称执行顺序已确认。

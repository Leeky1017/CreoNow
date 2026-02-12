# Active Changes Execution Order

更新时间：2026-02-12 16:47

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**单线串行执行**。
- 所属模块：Workbench P5 UI 外壳层落地收口。
- 已归档完成：
  - `openspec/changes/archive/workbench-p5-00-contract-sync`
  - `openspec/changes/archive/workbench-p5-01-layout-iconbar-shell`
  - `openspec/changes/archive/workbench-p5-02-project-switcher`
  - `openspec/changes/archive/workbench-p5-03-rightpanel-statusbar`
  - `openspec/changes/archive/workbench-p5-04-command-palette`

## 执行顺序

1. `workbench-p5-05-hardening-gate` — zod 校验、异常回退、去抖、NFR 验收、Storybook 补齐

## 依赖关系总览

```text
archive/workbench-p5-00-contract-sync (Phase A baseline)
    │
    ├──→ archive/workbench-p5-01-layout-iconbar-shell
    ├──→ archive/workbench-p5-02-project-switcher
    ├──→ archive/workbench-p5-03-rightpanel-statusbar
    ├──→ archive/workbench-p5-04-command-palette
    └──→ workbench-p5-05-hardening-gate
```

### 跨泳道依赖明细

- Change 05 为当前唯一活跃 change。
- Change 05 进入 Red 前，必须完成对 archive/01、archive/02、archive/03、archive/04 产出的 Dependency Sync Check。
- 所有 Change 均在 Workbench 模块内，无跨模块泳道依赖。

## 依赖说明

- 任一 change 的范围、依赖、状态变更时，必须同步更新本文件。

## 维护规则

- 当活跃 change 数量达到 2 个及以上时，需恢复多泳道顺序定义。
- 未同步本文件时，不得宣称执行顺序已确认。

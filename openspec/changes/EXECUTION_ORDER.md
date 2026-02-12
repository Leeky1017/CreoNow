# Active Changes Execution Order

更新时间：2026-02-12 15:10

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **6**。
- 执行模式：**三阶段串并混合**（Phase A 串行 → Phase B 并行 → Phase C 串行）。
- 所属模块：Workbench P5 UI 外壳层落地收口。

## 执行顺序

### Phase A — 依赖同步（串行，必须先完成）

1. `workbench-p5-00-contract-sync` — IPC 命名对齐、IconBar 列表对齐、RightPanel tab 对齐（纯 Spec 文字）

### Phase B — 主流程实现（并行，均依赖 Phase A）

2. `workbench-p5-01-layout-iconbar-shell` — 三栏布局约束 + IconBar Spec 对齐
3. `workbench-p5-02-project-switcher` — Sidebar 顶部项目切换器完整实现
4. `workbench-p5-03-rightpanel-statusbar` — RightPanel 结构修正 + StatusBar 信息补齐
5. `workbench-p5-04-command-palette` — 命令面板文件搜索 + 分类展示

### Phase C — 硬化收口（串行，依赖 Phase B 全部完成）

6. `workbench-p5-05-hardening-gate` — zod 校验、异常回退、去抖、NFR 验收、Storybook 补齐

## 依赖关系总览

```text
workbench-p5-00-contract-sync (Phase A)
    │
    ├──→ workbench-p5-01-layout-iconbar-shell     ← 依赖 00 的 IconBar 列表 delta
    ├──→ workbench-p5-02-project-switcher          ← 依赖 00 的 IPC 通道名确认
    ├──→ workbench-p5-03-rightpanel-statusbar      ← 依赖 00 的 RightPanel tab 决定
    └──→ workbench-p5-04-command-palette           ← 依赖 00 的 IPC 文件列表通道确认
              │
              ▼
         workbench-p5-05-hardening-gate            ← 依赖 01-04 全部合并后
```

### 跨泳道依赖明细

- Change 01–04 无互相依赖，可并行执行。
- Change 05 依赖 Change 01–04 全部合并后方可进入 Red。
- 所有 Change 均在 Workbench 模块内，无跨模块泳道依赖。

## 依赖说明

- Change 01–04 进入 Red 前，必须完成对 Change 00 delta spec 的 Dependency Sync Check。
- Change 05 进入 Red 前，必须完成对 Change 01–04 全部产出的 Dependency Sync Check。
- 任一 change 的范围、依赖、状态变更时，必须同步更新本文件。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 当活跃 change 数量达到 2 个及以上时，需恢复多泳道顺序定义。
- 未同步本文件时，不得宣称执行顺序已确认。

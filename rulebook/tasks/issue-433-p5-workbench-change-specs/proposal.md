# Proposal: issue-433-p5-workbench-change-specs

## Why

需要将 Workbench P5 UI 外壳层落地收口拆分为 6 个变更包（Phase A → Phase B 并行 → Phase C），为后续 Agent 执行实现提供可审阅、可测试、可追踪的 delta 基线。P5-WORKBENCH-ANALYSIS.md 已完成全面的缺陷分析和 Spec 覆盖矩阵，本任务将分析结果转化为标准 OpenSpec change 文档。

## What Changes

- 新建 6 个 OpenSpec change 目录并分别编写 proposal/specs/tasks 三件套：
  - `workbench-p5-00-contract-sync` (Phase A: IPC 命名对齐、IconBar 列表对齐、RightPanel tab 对齐)
  - `workbench-p5-01-layout-iconbar-shell` (Phase B: 三栏布局约束 + IconBar Spec 对齐)
  - `workbench-p5-02-project-switcher` (Phase B: Sidebar 顶部项目切换器完整实现)
  - `workbench-p5-03-rightpanel-statusbar` (Phase B: RightPanel 结构修正 + StatusBar 信息补齐)
  - `workbench-p5-04-command-palette` (Phase B: 命令面板文件搜索 + 分类展示)
  - `workbench-p5-05-hardening-gate` (Phase C: zod 校验、异常回退、去抖、NFR 验收)
- 在每个 delta spec 中使用 [ADDED]/[MODIFIED]/[REMOVED]/[DEFERRED] 标记变更点
- 更新 `openspec/changes/EXECUTION_ORDER.md`，明确 6 个活跃 change 的三阶段串并混合依赖顺序

## Impact

- Affected specs:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/workbench-p5-00-contract-sync/**`
  - `openspec/changes/workbench-p5-01-layout-iconbar-shell/**`
  - `openspec/changes/workbench-p5-02-project-switcher/**`
  - `openspec/changes/workbench-p5-03-rightpanel-statusbar/**`
  - `openspec/changes/workbench-p5-04-command-palette/**`
  - `openspec/changes/workbench-p5-05-hardening-gate/**`
- Affected code: 无（本任务仅编写变更规范）
- Breaking change: NO
- User benefit: 为 Workbench P5 后续实现提供稳定、可审阅且可按阶段执行的规范蓝图。

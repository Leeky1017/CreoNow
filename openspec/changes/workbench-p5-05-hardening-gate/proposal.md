# 提案：workbench-p5-05-hardening-gate

## 背景

P5 Phase C 收口：将 Workbench Spec 中所有鲁棒性、性能、边界场景要求落地为可验收闭环。

S2 级缺陷清单：
- S2-1：Store 缺少 zod 输入校验（`layoutStore`、`themeStore`、`commandPalette`）
- S2-2：布局恢复失败无回退与提示
- S2-3：主题跟随系统未实现（无 `matchMedia` 监听）
- S2-4：主题值非法时未阻断写入（未写回修正值）
- S2-5：并发快捷键无去抖（`Cmd/Ctrl+L`、`Cmd/Ctrl+\`）
- S2-6：双拖拽冲突无显式处理
- S2-7：`activeLeftPanel` / `activeRightPanel` 部分未持久化（`activeLeftPanel` 仍缺）

此外需补齐：Resizer 悬停样式、右侧面板折叠按钮、Storybook 全覆盖审计、NFR 阈值验收。

## 变更内容

- **zod 校验**：`layoutStore` 输入参数（sidebarWidth, panelWidth, sidebarCollapsed, panelCollapsed）加 zod schema；`themeStore` 用 zod 替代手写 `normalizeMode`；`commandPalette` 输入参数校验
- **非法偏好回退**：`layoutStore` zod 校验失败 → 回退默认值 + 写入修正值 + 状态栏一次性提示「布局已重置」；`themeStore` 非法值 → 回退 `system` + 写入修正值
- **主题跟随系统**：添加 `matchMedia('(prefers-color-scheme: dark)')` 监听；`system` 模式下自动跟随 OS
- **并发去抖**：`Cmd/Ctrl+L`、`Cmd/Ctrl+\` 等布局快捷键加 300ms debounce
- **双拖拽**：Resizer 添加显式 last-write-wins 保证（全局 dragging flag）
- **Resizer 悬停样式**：悬停时分割线 2px 高亮 + `cursor: col-resize`
- **右侧面板折叠按钮**：面板内添加折叠按钮
- **activeLeftPanel 持久化**：补齐 `creonow.layout.activeLeftPanel` 持久化
- **Storybook 补齐**：审计所有 Layout 组件 Story 覆盖度，补齐缺失状态组合
- **NFR 验收**：TTI p95 < 1.2s、侧栏动画 p95 < 220ms、命令面板 p95 < 120ms
- **RUN_LOG 收口**：所有 P5 change 的 task_runs 完整、PR 链接回填

## 受影响模块

- Workbench — `renderer/src/components/layout/` 全部组件、`renderer/src/features/commandPalette/`
- Store — `renderer/src/stores/layoutStore.tsx`、`renderer/src/stores/themeStore.tsx`

## 依赖关系

- 上游依赖：
  - `workbench-p5-01-layout-iconbar-shell` — IconBar 和布局实现已完成
  - `workbench-p5-02-project-switcher` — ProjectSwitcher 已集成
  - `workbench-p5-03-rightpanel-statusbar` — RightPanel 和 StatusBar 已修正
  - `workbench-p5-04-command-palette` — CommandPalette 文件搜索已实现
- 下游依赖：无（P5 收口项）

## Dependency Sync Check

- 核对输入：Change 01–04 全部 delta spec 和实现产出
- 核对项：数据结构、store API、组件 prop 接口、错误码
- 结论：待 Change 01–04 全部合并后执行

## 不做什么

- 不修改核心功能逻辑（仅做鲁棒性增强和验收）
- 不新增功能特性
- 不调整 Owner 固定的快捷键映射或布局约束值

## 审阅状态

- Owner 审阅：`PENDING`

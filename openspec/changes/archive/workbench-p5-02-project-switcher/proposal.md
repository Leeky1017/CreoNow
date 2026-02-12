# 提案：workbench-p5-02-project-switcher

## 背景

S0-4 级缺陷：项目切换器（ProjectSwitcher）存在但未集成到 Sidebar，且实现为原生 `<select>` 元素，不满足 Spec 要求的「可搜索下拉面板」。

Spec 要求（`workbench/spec.md:222`）：系统必须在左侧栏顶部（Sidebar 内，Icon Bar 下方）设置项目切换器，支持搜索过滤、空状态、`--shadow-md` 下拉样式。

## 变更内容

- 重写 `ProjectSwitcher.tsx`：将原生 `<select>` 替换为可搜索下拉面板组件
- 下拉面板样式：`--shadow-md`，`z-index: var(--z-dropdown)`
- 搜索过滤：输入即搜，按最近打开时间降序排列
- 空状态：显示「暂无项目」+ 「创建新项目」按钮
- 超时进度条：项目切换 >1s 时显示 2px 进度条
- Sidebar 集成：在 `Sidebar.tsx` 顶部渲染 ProjectSwitcher
- IPC 对接：使用 Change 00 确认的实际通道名 `project:project:switch`、`project:project:list`
- 新建 Storybook Story：展开态（有项目列表）、搜索态、空态（无项目）

## 受影响模块

- Workbench — `renderer/src/features/projects/ProjectSwitcher.tsx`（重写）、`renderer/src/components/layout/Sidebar.tsx`（集成）
- Store — `renderer/src/stores/projectStore.tsx`（IPC 调用验证）

## 依赖关系

- 上游依赖：
  - `workbench-p5-00-contract-sync` — IPC 通道名确认（`project:project:switch`、`project:project:list`）
- 下游依赖：
  - `workbench-p5-05-hardening-gate` — 依赖本 change 完成后再做全局硬化

## 不做什么

- 不修改 IPC 契约本身（后端已实现 `project:project:switch`/`project:project:list`）
- 不实现项目创建流程（仅提供「创建新项目」按钮入口，跳转由 Project Management 模块负责）
- 不实现项目切换期间的全局锁定（→ Change 05 hardening）

## 审阅状态

- Owner 审阅：`PENDING`

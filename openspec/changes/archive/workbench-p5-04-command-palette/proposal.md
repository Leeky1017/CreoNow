# 提案：workbench-p5-04-command-palette

## 背景

S1-1 级缺陷：CommandPalette 缺少文件搜索和分类展示。

Spec 要求（`workbench/spec.md:274`）搜索结果分类展示为三类：最近使用、文件、命令。当前实现（`CommandPalette.tsx:376-529`）仅有 4 组硬编码命令（Suggestions/Layout/Document/Project），无文件搜索能力，无"最近使用"分类。`AppShell.tsx:744-750` 未传入 `commands` prop，运行时始终使用 `defaultCommands`。

组件本身支持 `commands: CommandItem[]` prop 和任意 `group` 分类（Storybook mock 已演示），但运行时集成未传入文件项。

## 变更内容

- 搜索结果三类分类：最近使用（从 localStorage/store 读取）、文件（从 `fileStore.items` 搜索）、命令（现有命令列表）
- 文件打开能力：选中文件项后加载对应文档到编辑器（调用 `editorStore.openDocument`）
- 无结果文案：输入不匹配时显示「未找到匹配结果」
- 容量策略：首屏 100 项 + 滚动加载（Spec `workbench/spec.md:478-483`）
- 性能指标：首批结果 200ms 内显示（Spec `workbench/spec.md:421-422`）
- `AppShell.tsx` 集成：动态构建 `commands` prop，注入文件列表和最近使用项
- Storybook：默认态、分类搜索结果态、无结果态

## 受影响模块

- Workbench — `renderer/src/features/commandPalette/CommandPalette.tsx`、`renderer/src/components/layout/AppShell.tsx`
- Store — `renderer/src/stores/editorStore.tsx`（`openDocument` 调用）、`fileStore`（文件列表）

## 依赖关系

- 上游依赖：
  - `workbench-p5-00-contract-sync` — IPC 文件列表通道确认
- 下游依赖：
  - `workbench-p5-05-hardening-gate` — 性能验收、大结果集分页压测

## 不做什么

- 不修改 CommandPalette 组件的基础 UI 框架（复用现有 modal + 搜索框 + 列表结构）
- 不实现模糊搜索算法优化（使用简单 includes 匹配，性能优化在 Change 05）
- 不实现命令面板的快捷键自定义

## 审阅状态

- Owner 审阅：`PENDING`

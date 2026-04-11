# 前端页面推进路线

> **黄金设计源**：`figma_design/前端完整参考/src/app/components/`
> **前端策略**：小修补，不大动。现有设计中的动效、Zen Mode、布局结构、交互模式均属优秀设计，禁止推翻重建。

## 页面清单与优先级

| # | 页面 | 黄金源文件 | 对应 Renderer 路径 | 状态 | P 阶段 |
|---|------|---------|-----------------|------|--------|
| 1 | Layout (三栏布局) | `layout.tsx` | `renderer/src/components/layout/surfaces/` | 🟡 框架存在 | P1 |
| 2 | Editor (写作主面板) | `editor.tsx` | `renderer/src/features/editor/` | 🟡 ProseMirror 迁移中 | P1 |
| 3 | AI Panel | `ai-panel.tsx` | `renderer/src/features/ai/` | 🟡 基础可用 | P1 |
| 4 | Characters (角色列表) | `characters.tsx` | `renderer/src/features/kg/character/` | 🟡 列表 CRUD | P3 |
| 5 | Worldbuilding | `worldbuilding.tsx` | `renderer/src/features/kg/worldbuilding/` | ⚪ 未实现 | P3 |
| 6 | Knowledge Graph (可视化) | `knowledge-graph.tsx` | `renderer/src/features/kg/` | ⚪ 列表存在，图未实现 | P4+ |
| 7 | Memory Panel | `memory.tsx` | `renderer/src/features/memory/` | ⚪ 基础面板 | P3 |
| 8 | Dashboard | `dashboard.tsx` | `renderer/src/features/projects/dashboard/` | 🟡 部分实现 | P3 |
| 9 | Scenarios (场景列表) | `scenarios.tsx` | `renderer/src/features/scenarios/` | ⚪ 未实现 | P3 |
| 10 | Calendar | `calendar.tsx` | — | ⚪ 未实现 | P4+ |
| 11 | Command Palette | `command-palette.tsx` | `renderer/src/features/commandPalette/` | 🟡 基础可用 | P1 |
| 12 | Settings Modal | `settings-modal.tsx` | `renderer/src/features/settings/` | ⚪ 未实现 | P3 |
| 13 | Export/Publish | `export-publish-modal.tsx` | `renderer/src/features/files/export/` | ⚪ 后端可用，前端弹窗未实现 | P3 |
| 14 | Welcome Screen | `welcome-screen.tsx` | `renderer/src/features/onboarding/` | ⚪ 未实现 | P3 |
| 15 | Search Panel | （嵌入 layout） | `renderer/src/features/search/` | ⚪ 基础可用 | P3 |

## 前端任务模板

每个前端页面任务应遵循：

1. **读取黄金源**：`figma_design/前端完整参考/src/app/components/<对应文件>.tsx`
2. **比对现有实现**：`apps/desktop/renderer/src/features/<对应目录>/`
3. **增量修补**：修 bug → 接通 IPC → 补充缺失状态 → 对齐黄金源视觉
4. **新组件有 Story**：每个新 primitive/composite 必须有 Storybook story
5. **走 Token 体系**：颜色 `--cn-*`，间距 `--space-*`，字体 `--cn-font-*`
6. **PR 嵌入截图**：前端 PR 正文直接可见截图 + Storybook artifact link

## P1 前端任务

### TASK-FE-01: 三栏布局对齐
- 黄金源：`layout.tsx`
- 当前：框架存在但细节与黄金源有差异
- 任务：比对 Icon Bar 图标 + Left Sidebar 宽度 + Right Panel 折叠行为 → 对齐

### TASK-FE-02: Editor ProseMirror 集成
- 黄金源：`editor.tsx`
- 当前：ProseMirror 迁移进行中
- 任务：确保编辑器 → Skill pipeline 的前端入口（选中文本 → floating toolbar → 触发 Skill IPC）

### TASK-FE-03: AI Panel 完善
- 黄金源：`ai-panel.tsx`
- 当前：基础可用
- 任务：比对与黄金源的差异 → 补充流式输出动画 → Skill 结果预览面板

### TASK-FE-04: Command Palette 对齐
- 黄金源：`command-palette.tsx`
- 当前：基础可用
- 任务：比对搜索行为 + 快捷键 + 结果分组

## P3 前端任务

### TASK-FE-05 ~ TASK-FE-14
（Characters、Worldbuilding、Memory、Dashboard、Scenarios、Settings、Export、Welcome、Search 各页面的增量对齐任务，格式同上）

## 前端约束

- 视觉规范：`docs/references/frontend-visual-quality.md`
- 组件复用：检查 `primitives/` 和 `composites/` 已有组件
- 禁止事项：Tailwind 原始色值 | JSX 裸字符串 | Tailwind 内置阴影 | 硬编码颜色
- 动效：Framer Motion，三档时长（80/120/300ms），ease-out 为主
- 双主题：亮色 + 暗色均需完整支持

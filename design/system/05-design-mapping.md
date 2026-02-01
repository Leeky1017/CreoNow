# 设计稿到代码映射表

> **来源**: DESIGN_DECISIONS.md §15 + 方法论附录  
> **用途**: 明确每个设计稿对应的代码实现

---

## UI 模块总览

```
独立页面:           6 个
嵌入式面板:         8 个
浮层组件:           3 个
原子组件:          ~20 个
────────────────────────
UI 模块总计:       ~37 个
```

### 独立页面（6 个）

| # | 页面 | 设计稿 | 说明 |
|---|------|--------|------|
| 1 | Login | `01-login.html` | 登录/注册（V1 仅本地入口） |
| 2 | Onboarding | `02-onboarding.html` | 首次使用引导 |
| 3 | Dashboard | `05-dashboard-sidebar-full.html` | 项目/文档管理入口 |
| 4 | Editor/Workbench | `09-editor-full-ide.html` | 核心写作界面 |
| 5 | Settings | `10-settings.html` | 偏好设置 |
| 6 | Analytics | `11-analytics.html` | 写作统计 |

### 嵌入式面板（8 个）

| # | 组件 | 设计稿 | 说明 |
|---|------|--------|------|
| 1 | Icon Bar | 无 | 左侧功能图标 48px |
| 2 | Sidebar - Files | `12-sidebar-filetree.html` | 文件树 |
| 3 | Sidebar - Outline | `13-sidebar-outline.html` | 文档大纲 |
| 4 | Right Panel - AI | `14-ai-panel.html` | AI 对话 |
| 5 | Right Panel - Info | `15-info-panel.html` | 属性面板 |
| 6 | Knowledge Graph | `19-knowledge-graph.html` | 知识图谱 |
| 7 | Character Manager | `18-character-manager.html` | 角色管理 |
| 8 | Status Bar | 无 | 底部状态栏 28px |

### 浮层组件（3 个）

| # | 组件 | 设计稿 | 说明 |
|---|------|--------|------|
| 1 | Command Palette | `17-command-palette.html` | 快速命令 Cmd+K |
| 2 | Create Project | `16-create-project-dialog.html` | 创建项目对话框 |
| 3 | Confirm/Alert | 无 | 通用确认对话框 |

### 原子组件（约 20 个）

| 分类 | 组件 |
|------|------|
| 基础 | Button, Input, Textarea, Select, Checkbox, Radio |
| 展示 | Text, Heading, Badge, Avatar, Icon, Spinner, Skeleton |
| 容器 | Card, ListItem, TreeItem, Tabs, Accordion |
| 反馈 | Toast, Tooltip, Popover, Dialog |

---

## 一、设计稿优先级

| 优先级 | 说明 |
|--------|------|
| **P0** | 必须先完成，核心功能 |
| **P1** | 核心功能，高优先级 |
| **P2** | 增强功能，可延后 |

---

## 二、完整映射表

| 编号 | 设计稿 | 对应组件/页面 | 优先级 | 状态 | 备注 |
|------|--------|---------------|--------|------|------|
| 01 | `01-login.html` | LoginPage | P1 | 待实现 | V1 仅本地入口 |
| 02 | `02-onboarding.html` | OnboardingPage | P1 | 待实现 | 首次使用引导 |
| 03 | `03-dashboard-bento-cards.html` | Dashboard 变体 | P2 | 备选 | 备选布局 |
| 04 | `04-dashboard-list-progress.html` | Dashboard 变体 | P2 | 备选 | 备选布局 |
| 05 | `05-dashboard-sidebar-full.html` | **DashboardPage** | **P0** | 待实现 | 主设计 |
| 06 | `06-dashboard-sidebar-dark.html` | Dashboard 变体 | P2 | 参考 | 配色参考 |
| 07 | `07-editor-simple.html` | 禅模式 | P1 | 待实现 | F11 触发 |
| 08 | `08-editor-workspace.html` | Editor 变体 | P2 | 参考 | 中间态 |
| 09 | `09-editor-full-ide.html` | **EditorPage** | **P0** | 待实现 | 核心界面 |
| 10 | `10-settings.html` | SettingsPanel | P1 | 待实现 | 设置面板 |
| 11 | `11-analytics.html` | AnalyticsPage | P2 | 待实现 | 写作统计 |
| 12 | `12-sidebar-filetree.html` | **FileTreePanel** | **P0** | 待实现 | 核心组件 |
| 13 | `13-sidebar-outline.html` | OutlinePanel | P1 | 待实现 | 文档大纲 |
| 14 | `14-ai-panel.html` | **AIPanelPanel** | **P0** | 待实现 | 核心组件 |
| 15 | `15-info-panel.html` | InfoPanel | P1 | 待实现 | 属性面板 |
| 16 | `16-create-project-dialog.html` | CreateProjectDialog | P1 | 待实现 | 创建项目 |
| 17 | `17-command-palette.html` | CommandPalette | P1 | 待实现 | Cmd+K |
| 18 | `18-character-manager.html` | CharacterManager | P2 | 待实现 | 角色管理 |
| 19 | `19-knowledge-graph.html` | KnowledgeGraphPanel | P2 | 待实现 | 知识图谱 |
| 20 | `20-memory-panel.html` | MemoryPanel | P1 | 待实现 | 记忆系统 |
| 21 | `21-skills-picker.html` | SkillsPicker | P1 | 待实现 | 技能选择 |
| 22 | `22-context-viewer.html` | ContextViewer | P1 | 待实现 | 上下文查看 |
| 23 | `23-version-history.html` | VersionHistory | P1 | 待实现 | 版本历史 |
| 24 | `24-diff-view.html` | DiffView | P1 | 待实现 | 差异对比 |
| 25 | `25-search-panel.html` | SearchPanel | P1 | 待实现 | 搜索面板 |
| 26 | `26-empty-states.html` | EmptyState 组件 | P1 | 参考 | 空状态设计 |
| 27 | `27-loading-states.html` | LoadingState 组件 | P1 | 参考 | 加载状态设计 |
| 28 | `28-template-picker.html` | TemplatePicker | P1 | 待实现 | 模板选择 |
| 29 | `29-export-dialog.html` | ExportDialog | P1 | 待实现 | 导出对话框 |
| 30 | `30-zen-mode.html` | ZenMode | P1 | 参考 | 禅模式界面 |
| 31 | `31-interaction-patterns.html` | - | P2 | 参考 | 交互模式参考 |
| 32 | `32-ai-streaming-states.html` | - | P1 | 参考 | AI 流式状态 |
| 33 | `33-ai-dialogs.html` | - | P1 | 参考 | AI 对话框 |
| 34 | `34-component-primitives.html` | - | P0 | 参考 | 原子组件参考 |
| 35 | `35-constraints-panel.html` | ConstraintsPanel | P1 | 待实现 | 约束面板 |

---

## 三、页面类型与布局

| 页面类型 | 布局 | 设计稿参考 |
|----------|------|-----------|
| 登录/注册 | 全屏居中 | `01-login.html` |
| 引导页 | 全屏居中 | `02-onboarding.html` |
| Dashboard | 左侧导航 + 主内容 | `05-dashboard-sidebar-full.html` |
| 编辑器 | 三栏布局（Icon Bar + Sidebar + Main + Panel） | `09-editor-full-ide.html` |
| 禅模式 | 全屏纯编辑 | `07-editor-simple.html`, `30-zen-mode.html` |

---

## 四、嵌入式面板

| 面板 | 设计稿 | 位置 | 尺寸 |
|------|--------|------|------|
| Icon Bar | 无 | 最左侧 | 48px 固定 |
| Sidebar - Files | `12-sidebar-filetree.html` | 左侧 | 180-400px |
| Sidebar - Outline | `13-sidebar-outline.html` | 左侧 | 180-400px |
| Right Panel - AI | `14-ai-panel.html` | 右侧 | 280-480px |
| Right Panel - Info | `15-info-panel.html` | 右侧 | 280-480px |
| Status Bar | 无 | 底部 | 28px 固定 |

---

## 五、浮层组件

| 组件 | 设计稿 | 触发方式 |
|------|--------|----------|
| Command Palette | `17-command-palette.html` | Cmd+K / Cmd+P |
| Create Project | `16-create-project-dialog.html` | 按钮点击 |
| Confirm/Alert | 无 | 程序触发 |
| Export Dialog | `29-export-dialog.html` | 菜单选择 |

---

## 六、代码目录映射

```
apps/desktop/renderer/src/
├── pages/
│   ├── LoginPage.tsx           ← 01-login.html
│   ├── OnboardingPage.tsx      ← 02-onboarding.html
│   ├── DashboardPage.tsx       ← 05-dashboard-sidebar-full.html
│   └── EditorPage.tsx          ← 09-editor-full-ide.html
├── features/
│   ├── file-tree/              ← 12-sidebar-filetree.html
│   ├── outline/                ← 13-sidebar-outline.html
│   ├── ai-panel/               ← 14-ai-panel.html
│   ├── info-panel/             ← 15-info-panel.html
│   ├── command-palette/        ← 17-command-palette.html
│   └── ...
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Panel.tsx
│   │   ├── IconBar.tsx
│   │   └── StatusBar.tsx
│   ├── primitives/             ← 34-component-primitives.html
│   └── patterns/
│       ├── EmptyState.tsx      ← 26-empty-states.html
│       └── LoadingState.tsx    ← 27-loading-states.html
```

---

## 七、设计稿颜色映射规则

设计稿中可能存在蓝色/紫色强调色，实现时 **MUST 替换**：

| 设计稿中的颜色 | 实现时使用 |
|---------------|-----------|
| #3b82f6（蓝色） | --color-accent（纯白） |
| #5E6AD2 / #5D3FD3（紫色） | --color-accent（纯白） |
| rgba(59, 130, 246, ...) | --color-accent-subtle 或 --color-accent-muted |

**例外**: 知识图谱节点保持多色区分，使用 `--color-node-*` 变量。

# Workbench Specification Delta

## Change: workbench-p5-02-project-switcher

### Requirement: 项目切换器 [MODIFIED]

项目切换器从 Spec 描述升级为完整实现规格：

- 默认显示当前项目名称和类型图标 [ADDED 实现细节]
- 点击后展开项目列表下拉面板（`--shadow-md`，`z-index: var(--z-dropdown)`）
- 下拉面板最大高度 `320px`，超出滚动 [ADDED]
- 列表支持搜索过滤（输入即搜，debounce 150ms）[ADDED 实现细节]
- 列表按最近打开时间降序排列
- 每个项目项显示：项目名称、类型图标、最近打开时间（相对时间格式）[ADDED]
- 选择项目后关闭下拉面板，触发 `project:project:switch` IPC 通道
- 项目切换超过 1s 时，在下拉面板顶部显示 2px 进度条 [ADDED]
- 组件必须集成到 `Sidebar.tsx` 顶部（所有面板内容之上）[ADDED]

#### Scenario: 项目切换器集成到 Sidebar 顶部 [ADDED]

- **假设** 应用启动，左侧 Sidebar 展开
- **当** Sidebar 渲染
- **则** Sidebar 最顶部渲染 ProjectSwitcher 组件
- **并且** ProjectSwitcher 显示当前项目名称
- **并且** 面板内容（文件树/大纲等）在 ProjectSwitcher 下方

#### Scenario: 项目切换器下拉面板样式 [ADDED]

- **假设** 用户点击 ProjectSwitcher
- **当** 下拉面板展开
- **则** 面板使用 `--shadow-md` 阴影、`z-index: var(--z-dropdown)`
- **并且** 顶部为搜索输入框，自动聚焦
- **并且** 列表最大高度 320px，超出部分可滚动

#### Scenario: 项目切换超时进度条 [ADDED]

- **假设** 用户选择了一个项目
- **当** `project:project:switch` IPC 响应超过 1s
- **则** 在 ProjectSwitcher 区域顶部显示 2px 进度条
- **并且** 切换完成后进度条消失

#### Scenario: ProjectSwitcher Storybook 覆盖 [ADDED]

- **假设** Storybook 加载 ProjectSwitcher Stories
- **当** 浏览所有 Story
- **则** 覆盖：展开态（有项目列表）、搜索态（过滤结果）、空态（无项目 +「创建新项目」按钮）

---

## Out of Scope

- IPC 契约变更（后端已实现）
- 项目创建完整流程（仅提供按钮入口）
- 项目切换期间全局锁定（→ workbench-p5-05）

# Workbench Specification Delta

## Change: workbench-p5-01-layout-iconbar-shell

### Requirement: Icon Bar（图标栏）[MODIFIED]

IconBar 激活态视觉样式修正：

- 当前激活项**必须**有左侧 2px 白色指示条（`--color-accent`），替代原矩形边框高亮 [MODIFIED]
- 激活项**不使用** `border` + `bg-selected` 矩形高亮样式 [MODIFIED]
- 非激活项背景透明，仅悬停时显示 `var(--color-bg-hover)`

#### Scenario: IconBar 激活指示条正确渲染 [ADDED]

- **假设** 当前 Icon Bar 激活项为 `files`
- **当** IconBar 渲染
- **则** `files` 按钮左侧显示 2px 白色指示条（`border-left: 2px solid var(--color-accent)`）
- **并且** 其余按钮无指示条、背景透明

#### Scenario: IconBar 顺序与 delta spec 一致 [ADDED]

- **假设** 应用启动，IconBar 渲染
- **当** 检查顶部图标列表
- **则** 顺序为 files → search → outline → versionHistory → memory → characters → knowledgeGraph
- **并且** settings 固定在底部

#### Scenario: IconBar 图标规格符合 Spec [ADDED]

- **假设** IconBar 渲染
- **当** 检查任意图标按钮
- **则** 图标尺寸 24px，按钮区域 40×40px，居中对齐（flexbox）
- **并且** 每个按钮有 `aria-label` 属性

---

### Requirement: 整体布局架构 [MODIFIED]

补充折叠动画与 Storybook 覆盖要求：

#### Scenario: 侧栏折叠/展开动画过渡 [ADDED]

- **假设** 左侧 Sidebar 处于展开状态
- **当** 用户点击当前激活图标或按 `Cmd/Ctrl+\`
- **则** Sidebar 折叠动画使用 `var(--duration-slow)` 过渡
- **并且** 展开动画同样使用 `var(--duration-slow)` 过渡

#### Scenario: AppShell Storybook 四态覆盖 [ADDED]

- **假设** Storybook 加载 AppShell Stories
- **当** 浏览所有 Story
- **则** 覆盖：三栏全展开态、左侧栏折叠态、右侧面板折叠态、双侧均折叠态

---

## Out of Scope

- ProjectSwitcher 集成（→ workbench-p5-02）
- RightPanel 结构修正（→ workbench-p5-03）
- zod 校验、去抖、鲁棒性增强（→ workbench-p5-05）

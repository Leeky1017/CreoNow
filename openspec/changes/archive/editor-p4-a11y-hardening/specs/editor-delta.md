# Editor Specification Delta

## Change: editor-p4-a11y-hardening

### Requirement: 编辑器无障碍性（Accessibility）[MODIFIED]

编辑器及子组件必须满足基础无障碍要求。

- 工具栏按钮 `aria-label`，toggle 按钮 `aria-pressed`。
- 大纲面板 `role="tree"` / `role="treeitem"` + `aria-selected` + `aria-expanded`。
- 键盘导航：Tab 聚焦、Arrow 列表导航、Enter 激活、Escape 关闭。
- 焦点环 `--color-ring-focus` / `--ring-focus-width`（2px） / `--ring-focus-offset`（2px），仅 `:focus-visible`。

#### Scenario: Keyboard-only user navigates toolbar [ADDED]

- **假设** 用户仅使用键盘导航
- **当** 用户 Tab 进入工具栏并 Enter 点击 Bold 按钮
- **则** Bold 格式 toggle
- **并且** Bold 按钮显示焦点环

#### Scenario: Screen reader announces toolbar button state [ADDED]

- **假设** 屏幕阅读器已激活
- **当** 焦点落在当前 active 的 Bold 按钮
- **则** 屏幕阅读器播报 "Bold, pressed"（或等效表述）

### Requirement: 模块级可验收标准 [MODIFIED]

- 键入渲染 p95 < 16ms（60fps）。
- 自动保存 p95 < 500ms。
- Diff 面板打开 p95 < 200ms。
- 自动保存失败必须可见可重试。
- 文档加载失败进入 error state。
- AI 应用冲突返回 `CONFLICT` 并保留原文。

#### Scenario: 编辑性能达标 [ADDED]

- **假设** 文档长度 100,000 字
- **当** 用户连续键入 2 分钟
- **则** 键入延迟 p95 < 16ms
- **并且** 无明显掉帧（< 55fps）

#### Scenario: AI 应用冲突阻断覆盖 [ADDED]

- **假设** 引用选择区间在生成后被用户改动
- **当** 用户点击「应用到编辑器」
- **则** 返回 `CONFLICT`
- **并且** 不覆盖当前编辑内容

### Requirement: 异常与边界覆盖矩阵 [MODIFIED]

必须覆盖 5 类异常：网络/IO 失败、数据异常、并发冲突、容量溢出、权限/安全。

#### Scenario: 自动保存与手动保存竞态 [ADDED]

- **假设** autosave 正在进行
- **当** 用户同时按下 `Cmd/Ctrl+S`
- **则** 手动保存优先并复用同一写入队列
- **并且** 最终状态为 `saved`

#### Scenario: 超大粘贴触发分块处理 [ADDED]

- **假设** 用户粘贴 2MB 文本
- **当** 编辑器处理 paste
- **则** 分块解析并在 1s 内完成首屏渲染
- **并且** 超限部分提示用户确认继续

### Non-Functional Requirements [MODIFIED]

#### Scenario: 大纲重算取消旧任务 [ADDED]

- **假设** 用户快速输入触发 10 次大纲重算
- **当** 新任务到达
- **则** 取消旧任务，仅保留最后一次
- **并且** UI 无卡顿

#### Scenario: 文档容量超限提示 [ADDED]

- **假设** 文档达到 1,000,000 字符上限
- **当** 用户继续输入
- **则** 状态栏提示容量上限并建议拆分文档
- **并且** 不出现崩溃

## Out of Scope

- 不新增功能特性
- 不修改已通过的外部行为契约

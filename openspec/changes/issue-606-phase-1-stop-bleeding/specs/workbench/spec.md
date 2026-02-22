# Workbench Specification Delta

更新时间：2026-02-22 11:36

## Change: issue-606-phase-1-stop-bleeding

### Requirement: 整体布局架构 [MODIFIED]

Workbench 的弹层与浮层层级必须回归 Token 体系，避免局部堆叠上下文导致的 Z 轴穿透。

- Feature 层禁止使用数字型 z-index（如 `z-10/z-20/z-30/z-50`）。
- Dropdown/Popover/Modal/Tooltip 必须使用 `--z-*` 语义层级 token。
- 当弹层需要脱离局部布局上下文时，必须通过统一 Portal 宿主渲染并保持 token 层级顺序。

#### Scenario: 多层浮层叠加时必须遵循 token 层级 [ADDED]

- **假设** Workbench 同时存在下拉菜单、弹出层与模态框
- **当** 用户触发叠层交互
- **则** 各浮层按 `--z-dropdown` < `--z-popover` < `--z-modal` 的顺序显示
- **并且** 不出现上下文菜单覆盖模态框的穿透现象

#### Scenario: 引入数字 z-index 时必须被门禁阻断 [ADDED]

- **假设** Feature 组件新增 `z-10/z-20/z-30/z-50` 之类的数字层级样式
- **当** 进入质量门禁检查
- **则** 检查结果必须失败并提示使用 `--z-*` token
- **并且** 变更不得进入合并路径

### Requirement: Feature 层视觉 Token 执行 [ADDED]

Phase 1 必须先完成视觉止血，收敛业务层样式逃逸。

- Feature 层颜色必须映射到 `--color-*` 语义变量，禁止 raw Tailwind color、hex、rgba 与 `!bg-*` 强制覆盖。
- Feature 层阴影必须映射到 `--shadow-*` 阶梯，禁止魔法阴影值（如 `shadow-[0_18px_48px_rgba(...)]`）。

#### Scenario: 出现 raw color 时必须回退到语义 color token [ADDED]

- **假设** Feature 组件中出现 `text-blue-400`、`#xxxxxx` 或 `rgba(...)` 颜色写法
- **当** 开发者提交 Phase 1 变更
- **则** 颜色表达必须替换为 `--color-*` 语义 token
- **并且** 主题切换时不再出现局部色彩违和

#### Scenario: 出现魔法阴影时必须回退到 shadow token [ADDED]

- **假设** Feature 组件使用 `shadow-[0_18px_48px_rgba(...)]` 之类的阴影写法
- **当** 进入 Phase 1 止血实施
- **则** 阴影表达必须替换为 `--shadow-sm/md/lg/xl` 之一
- **并且** 深度层级表达在同类面板中保持一致

### Requirement: Feature 层交互元素必须复用 Primitives [ADDED]

Primitives 已具备 Button/Input 基础能力，Feature 层不得继续散写原生交互元素。

- Feature 层交互入口必须使用 `Button`、`Input` 等 Primitives。
- 除浏览器能力要求的受限场景外（如文件选择器封装），禁止直接散写原生 `<button>` 与 `<input>`。
- 替换后需保持键盘导航、focus 行为与 ARIA 语义不回退。

#### Scenario: Feature 层新增原生 button/input 时必须被阻断 [ADDED]

- **假设** 开发者在 Feature 组件直接新增原生 `<button>` 或 `<input>`
- **当** 代码进入测试与门禁阶段
- **则** 检查必须失败并要求改用 Primitives
- **并且** 已有交互行为（键盘/焦点/可访问性）保持不变

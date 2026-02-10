# Skill System Specification Delta

## Change: skill-system-p1-trigger-scope-management

### Requirement: 技能触发方式 [ADDED]

用户必须通过 AI 面板中的技能按钮触发技能执行。

- 技能按钮区域位于 AI 面板对话输入区上方，图标 + 名称水平排列。
- 点击展开技能选择面板，按分类展示（内置 / 全局自定义 / 项目级自定义）。
- 已停用技能灰显（`opacity: 0.5`、`cursor: not-allowed`），不可触发。
- 无自定义技能时显示空状态 + 「创建技能」按钮入口。
- 选择技能后自动判断输入来源并启动执行。
- 技能选择面板必须有 Storybook Story（默认态 / 空状态 / 禁用态）。

#### Scenario: 用户通过技能面板选择并执行技能 [ADDED]

- **假设** AI 面板已打开，用户在编辑器中选中文本
- **当** 用户点击技能按钮区域
- **则** 技能选择面板展开，显示分类后的可用技能列表
- **并且** 已停用技能灰显不可点击
- **当** 用户点击「改写」技能
- **则** 面板收起，系统开始执行改写流程

#### Scenario: 技能面板无自定义技能时的空状态 [ADDED]

- **假设** 用户未创建任何自定义技能
- **当** 技能选择面板展开
- **则** 内置技能正常显示
- **并且** 自定义技能区域显示空状态提示 + 「创建技能」按钮入口

### Requirement: 技能作用域管理 [ADDED]

技能有三级作用域：`builtin` / `global` / `project`。

| 作用域    | 可见范围 | 创建者 | 可删除 | 可停用 | 可修改作用域   |
| --------- | -------- | ------ | ------ | ------ | -------------- |
| `builtin` | 所有项目 | 系统   | 否     | 是     | 否             |
| `global`  | 所有项目 | 用户   | 是     | 是     | 可降为 project |
| `project` | 当前项目 | 用户   | 是     | 是     | 可升为 global  |

- 可见性解析顺序：`project → global → builtin`，同名项目级优先。
- 启停通过 `skill:registry:toggle`（Request-Response，语义对齐主规范 `skill:toggle`）持久化。

#### Scenario: 用户停用内置技能 [ADDED]

- **假设** 用户在技能管理界面查看内置技能列表
- **当** 用户关闭「翻译」技能的开关
- **则** 通过 `skill:registry:toggle` 发送 `{ skillId: "translate", enabled: false }`
- **并且** 持久化后「翻译」在技能选择面板中灰显

#### Scenario: 项目级技能覆盖全局技能 [ADDED]

- **假设** 全局和项目级均有同名技能「正式风格改写」
- **当** 用户在当前项目触发该技能
- **则** 执行项目级版本，忽略全局版本
- **并且** 技能选择面板标注「项目级覆盖」

#### Scenario: 用户将项目级技能提升为全局 [ADDED]

- **假设** 用户查看一个项目级自定义技能
- **当** 用户点击「提升为全局」
- **则** 通过 `skill:custom:update` 将 `scope` 从 `project` 改为 `global`
- **并且** 该技能在所有项目中可见

## Out of Scope

- 自定义技能创建/编辑/删除 UI（→ skill-system-p2）
- 并发调度 / 队列管理（→ skill-system-p3）
- 命令面板触发（仅面板按钮触发）

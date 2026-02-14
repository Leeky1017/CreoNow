# Workbench Specification Delta

## Change: s2-settings-disable

### Requirement: 未实现账户入口必须在设置中显式禁用 [ADDED]

Settings 对话框中尚未实现的账户相关操作必须以禁用态呈现，避免用户触发不可用功能：

- 账户入口按钮必须设置 `disabled`。
- 禁用态必须提供可见提示文本（例如“即将推出”）。
- 禁用态点击不得触发 `onUpgrade`、`onDeleteAccount` 等业务回调。

#### Scenario: 账户入口以禁用态展示并带提示 [ADDED]

- **假设** 用户打开 Settings 对话框并进入账户区
- **当** 渲染未实现账户入口
- **则** 入口按钮显示禁用态
- **并且** 用户可见“即将推出”提示文案

#### Scenario: 禁用态入口点击不触发业务回调 [ADDED]

- **假设** 账户入口处于禁用态
- **当** 用户尝试点击该入口
- **则** 不触发对应业务回调
- **并且** 不发起任何账户相关 IPC 请求

## Out of Scope

- 账户升级、删除、订阅等后端能力
- 设置页信息架构与其它分组功能

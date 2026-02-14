# IPC Specification Delta

## Change: s2-debug-channel-gate

### Requirement: Debug IPC 通道在生产环境必须默认不可注册 [ADDED]

IPC 主进程初始化时，`db:debug:tablenames` 仅允许在非 production 环境注册；production 环境必须阻断该调试通道以降低结构信息暴露风险。

#### Scenario: IPC-S2-DBG-S1 production 环境不注册 debug 通道 [ADDED]

- **假设** 进程运行在 `NODE_ENV=production`
- **当** 主进程执行 IPC 通道注册
- **则** `db:debug:tablenames` 不得被注册
- **并且** 任何调用方不得通过该通道读取数据库结构信息

#### Scenario: IPC-S2-DBG-S2 non-production 环境保留调试能力 [ADDED]

- **假设** 进程运行在非 production 环境
- **当** 主进程执行 IPC 通道注册
- **则** `db:debug:tablenames` 按既有调试用途可被注册
- **并且** 不得改变该通道既有成功/失败语义

## Out of Scope

- 新增或删除其他 IPC 通道。
- 修改 IPC 错误码字典与 envelope 结构。
- 扩展数据库调试功能范围。

# IPC Specification Delta

## Change: ipc-p1-channel-naming-governance

### Requirement: 通道命名规范 [MODIFIED]

所有 IPC 通道必须满足以下命名治理规则：

- 通道名称必须严格为三段式：`<domain>:<resource>:<action>`
- `domain` 必须来自契约注册表内的受控白名单，且与模块映射唯一对应
- `resource` 与 `action` 仅允许小写字母和数字，首字符必须为小写字母
- 任何不满足规则的通道定义必须在 `contract-generate` 阶段阻断并返回稳定错误码

命名违规错误码最小集合：

- `IPC_CONTRACT_INVALID_NAME`
- `IPC_CONTRACT_UNKNOWN_DOMAIN`
- `IPC_CONTRACT_NAME_COLLISION`

#### Scenario: 非白名单 domain 注册被阻断 [ADDED]

- **假设** 开发者定义通道 `plugin:tool:run`
- **当** 运行契约生成校验
- **则** 返回错误码 `IPC_CONTRACT_UNKNOWN_DOMAIN`
- **并且** 构建失败

#### Scenario: 两段式通道命名被阻断 [ADDED]

- **假设** 开发者定义通道 `project:create`
- **当** 运行契约生成校验
- **则** 返回错误码 `IPC_CONTRACT_INVALID_NAME`
- **并且** 输出“必须使用 `<domain>:<resource>:<action>`”的可读提示

#### Scenario: method 名冲突被阻断 [ADDED]

- **假设** 两个通道在 preload 生成后映射为同一个方法名
- **当** 运行契约生成脚本
- **则** 返回错误码 `IPC_CONTRACT_NAME_COLLISION`
- **并且** 输出冲突通道列表与来源文件

#### Scenario: 命名违规返回可定位信息 [ADDED]

- **假设** 某通道命名包含非法字符
- **当** 校验失败
- **则** 错误详情包含 `channel`、`filePath`、`rule` 三个字段
- **并且** 开发者可据此在一次修改内完成修复

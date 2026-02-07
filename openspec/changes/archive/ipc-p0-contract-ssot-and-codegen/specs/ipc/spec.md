# IPC Specification Delta

## Change: ipc-p0-contract-ssot-and-codegen

### Requirement: Schema-First 契约定义 [MODIFIED]

系统必须以单一契约注册表（Contract Registry）作为 IPC 的唯一事实来源（SSOT）。所有通道定义必须集中于 `packages/shared/types/ipc/` 并通过统一入口导出；主进程、preload、渲染进程不得手工维护通道字符串或重复声明 schema。

任何绕过契约注册表的 IPC 绑定均视为违规，必须在构建或校验阶段被阻断。

#### Scenario: 新增通道仅通过契约注册表完成 [ADDED]

- **假设** 开发者需要新增 `memory:episode:record`
- **当** 开发者在契约注册表补齐 `channel/mode/direction/request/description`
- **则** 生成脚本能在三端产物中得到一致通道定义
- **并且** 主进程与 preload 不需要手工追加同名字符串

#### Scenario: 绕过契约注册表直接绑定被阻断 [ADDED]

- **假设** 开发者在主进程直接写入未注册的 `ipcMain.handle("x:y:z", ...)`
- **当** 运行契约校验
- **则** 校验失败并阻断构建
- **并且** 输出可定位的违规通道信息

### Requirement: 契约自动生成与校验 [MODIFIED]

契约生成脚本必须保证输出可重复（deterministic）：在输入契约未变化的前提下，多次执行生成结果字节级一致。CI 必须执行“生成后无差异”检查，若生成物漂移则阻断合并。

脚本校验失败必须返回稳定错误码，至少包括：

- `IPC_CONTRACT_INVALID_NAME`
- `IPC_CONTRACT_MISSING_SCHEMA`
- `IPC_CONTRACT_DUPLICATED_CHANNEL`
- `IPC_CONTRACT_INVALID_SCHEMA_REFERENCE`

#### Scenario: 契约生成重复执行无差异 [ADDED]

- **假设** 契约定义未变化
- **当** 连续运行两次 `pnpm run contract:generate`
- **则** 第二次运行后 `git diff` 为空
- **并且** CI 的漂移检查通过

#### Scenario: Request-Response 缺失 response schema 被稳定错误码阻断 [ADDED]

- **假设** 某 Request-Response 通道未定义 response schema
- **当** 运行契约生成脚本
- **则** 返回错误码 `IPC_CONTRACT_MISSING_SCHEMA`
- **并且** 进程以非零退出码结束

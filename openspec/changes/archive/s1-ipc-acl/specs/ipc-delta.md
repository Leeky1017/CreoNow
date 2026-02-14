# IPC Specification Delta

## Change: s1-ipc-acl

### Requirement: IPC Handler 执行前必须完成调用方 ACL 鉴权 [MODIFIED]

在现有 schema/envelope 运行时校验之外，系统必须在主进程 handler 执行前执行调用方 ACL 校验。ACL 至少覆盖 `event.senderFrame.url`、`webContents.id` 与通道级权限策略；校验失败时必须终止业务执行并返回统一错误包络（`FORBIDDEN`）。

#### Scenario: SIA-S1 来源校验 [ADDED]

- **假设** 渲染进程通过 IPC 调用主进程通道
- **当** `senderFrame.url` 不在该通道允许来源列表（例如 `https://evil.com`）
- **则** ACL 校验失败，调用被拒绝
- **并且** 返回 `{ ok: false, error: { code: "FORBIDDEN" } }`，业务 handler 不执行

#### Scenario: SIA-S2 dev/prod origin 兼容 [ADDED]

- **假设** 应用分别运行在 development 与 production
- **当** 调用来源为 `http://localhost:*`（或 `VITE_DEV_SERVER_URL`）以及 `file://...`
- **则** ACL 在 development 与 production 均按对应白名单正确判定
- **并且** 不因环境差异误拒绝合法调用

#### Scenario: SIA-S3 拒绝非法调用 [ADDED]

- **假设** 渲染进程发起高权限通道调用（例如 `db:*`、`ai:run:*`）
- **当** 调用方不满足 ACL（来源、载体或身份策略不符合）
- **则** runtime-validation 在 `runWithTimeout` 前终止调用
- **并且** 统一返回 `FORBIDDEN`，不进入业务逻辑层

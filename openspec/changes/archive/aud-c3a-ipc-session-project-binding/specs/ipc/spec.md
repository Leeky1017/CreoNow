# ipc Specification Delta

## Change: aud-c3a-ipc-session-project-binding

### Requirement: IPC 会话必须可绑定 projectId，并用于 project 维度隔离（Wave0 / C3A）[ADDED]

系统必须提供 `webContentsId -> projectId` 的会话绑定能力，用于支撑 project isolation 与后续全域 project guard。至少满足：

- 绑定可读：给定 `webContentsId` 可解析出当前绑定的 `projectId`。
- 绑定可覆盖：重复 bind 同一 `webContentsId` 时必须覆盖旧值。
- 绑定可清理：clear 后解析必须回到 `null`。
- AI chat 历史必须按 projectId 隔离（send/list/clear 不互相污染）。

#### Scenario: IPC-AUD-C3A-S1 session binding 可绑定/可读/可清理 [ADDED]

- **假设** registry 初始为空
- **当** 查询某 `webContentsId`
- **则** 返回 `null`
- **当** bind `webContentsId -> project-a`，再 bind 为 `project-b`
- **则** resolve 必须返回最新绑定 `project-b`
- **当** clear 该 `webContentsId`
- **则** resolve 必须回到 `null`

#### Scenario: IPC-AUD-C3A-S2 AI chat history 必须按 projectId 隔离 [ADDED]

- **假设** project A 与 project B 分别发送消息
- **当** list project A 的历史
- **则** 仅包含 A 的消息
- **当** clear project A 的历史
- **则** project B 的历史不得被清空

#### Scenario: IPC-AUD-C3A-S3 启用 session binding 时必须拒绝 mismatched payload [ADDED]

- **假设** 某 `webContentsId` 已绑定 `project-bound`
- **当** 发送 payload 显式携带 `projectId=project-other`
- **则** handler 必须拒绝并返回 `FORBIDDEN`
- **并且** 当 payload 省略 `projectId` 时，允许使用绑定值隐式补全并成功执行

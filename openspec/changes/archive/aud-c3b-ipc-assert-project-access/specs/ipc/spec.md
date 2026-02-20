# ipc Specification Delta

## Change: aud-c3b-ipc-assert-project-access

### Requirement: 关键 IPC handler 必须统一执行 project access 校验（Wave1 / C3B）[ADDED]

当启用 `projectSessionBinding` 时，关键 IPC handlers（涉及 context/memory/knowledge 数据访问）必须拒绝与会话绑定不一致的 `projectId`，避免跨项目越权访问与数据串扰。

#### Scenario: IPC-AUD-C3B-S1 session-bound projectId 不匹配时必须返回 FORBIDDEN [ADDED]

- **假设** `webContentsId` 已绑定 `project-bound`
- **当** 对以下 handlers 发送 payload `projectId=project-other`：
  - `context:rules:list`
  - `memory:entry:list`
  - `knowledge:entity:list`
- **则** 三者都必须返回 `{ ok: false, error: { code: "FORBIDDEN" } }`

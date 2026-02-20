# context-engine Specification Delta

## Change: aud-h2a-main-hotpath-async-io

### Requirement: contextFs 热路径必须使用 async I/O，IPC handler 禁止调用 sync 版本（Wave0 / H2A）[ADDED]

系统必须移除主进程热路径的同步 I/O 风险点，至少满足：

- contextFs 提供 async 变体（ensure/status/list/read）并返回稳定 envelope。
- IPC handler 只能调用 async 变体，不得在热路径直接调用 sync 版本。

#### Scenario: CE-AUD-H2A-S1 contextFs async API 返回稳定 envelope 且可回归 [ADDED]

- **假设** 给定可写临时目录作为 `projectRootPath`
- **当** 调用 `ensureCreonowDirStructureAsync/getCreonowDirStatusAsync/listCreonowFilesAsync/readCreonowTextFileAsync`
- **则** 所有调用必须返回 `{ ok: true, data }` 的稳定结果
- **并且** 读取内容与列举结果可验证（可用于回归）

#### Scenario: CE-AUD-H2A-S2 IPC handler 必须调用 async 变体且禁止直接调用 sync 版本 [ADDED]

- **假设** 检查 `apps/desktop/main/src/ipc/contextFs.ts` 源码
- **当** 读取 handler 热路径实现
- **则** 必须调用 `*Async` 变体
- **并且** 不得出现直接调用 `ensureCreonowDirStructure(...)` / `getCreonowDirStatus(...)` 的同步版本

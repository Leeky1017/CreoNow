# IPC Specification Delta

## Change: db-native-binding-doctor

### Requirement: DB not ready 错误包含可判定诊断信息 [ADDED]

当主进程因 DB 初始化失败而无法提供数据库依赖能力时，IPC 必须返回结构化 `DB_ERROR`，并在 `details` 中提供可判定诊断信息，便于渲染层给出操作指引。

`details` 至少包含：

- `category`: `native_module_abi_mismatch` | `native_module_missing_binding` | `db_init_failed`
- `remediation.command`: 可执行修复命令（`pnpm -C apps/desktop rebuild:native`）
- `remediation.restartRequired`: `true`

#### Scenario: skills IPC 在 DB 不可用时返回诊断 details [ADDED]

- **假设** 主进程 DB 初始化失败，失败被识别为 `native_module_abi_mismatch`
- **当** 渲染层调用 `skill:registry:list`
- **则** 返回 `{ ok: false, error: { code: "DB_ERROR" } }`
- **并且** `error.details.category` 为 `native_module_abi_mismatch`
- **并且** `error.details.remediation.command` 为 `pnpm -C apps/desktop rebuild:native`

#### Scenario: AI proxy IPC 在 DB 不可用时返回诊断 details [ADDED]

- **假设** 主进程 DB 初始化失败，失败被识别为 `native_module_missing_binding`
- **当** 渲染层调用 `ai:proxysettings:get`
- **则** 返回 `{ ok: false, error: { code: "DB_ERROR" } }`
- **并且** `error.details.category` 为 `native_module_missing_binding`
- **并且** `error.details.remediation.restartRequired` 为 `true`


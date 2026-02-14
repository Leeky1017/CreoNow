# Skill System Specification Delta

## Change: s0-skill-loader-error

### Requirement: 技能目录扫描错误必须结构化暴露 [ADDED]

技能目录扫描在发生文件系统异常时，必须返回结构化错误信息，禁止以空数组静默替代真实失败。

返回结构至少包含：

- `dirs: string[]`
- `error.code: string`（如 `ENOENT`、`EACCES`、`UNKNOWN`）
- `error.path: string`

当扫描失败时，加载器必须保留 `dirs: []`，并通过日志事件记录失败上下文。

#### Scenario: SLE-S1 目录不存在返回结构化错误 [ADDED]

- **假设** `listSubdirs` 的目标路径不存在
- **当** 执行技能目录扫描
- **则** 返回 `{ dirs: [], error: { code: "ENOENT", path: "<dirPath>" } }`
- **并且** 记录目录读取失败日志（包含 `code` 与 `path`）

#### Scenario: SLE-S2 目录无权限返回结构化错误 [ADDED]

- **假设** `listSubdirs` 的目标路径存在但当前进程无读取权限
- **当** 执行技能目录扫描
- **则** 返回 `{ dirs: [], error: { code: "EACCES", path: "<dirPath>" } }`
- **并且** 不得将该异常伪装为“无技能目录”

#### Scenario: SLE-S3 可读目录保持原有发现行为 [ADDED]

- **假设** 目标目录可读且包含若干子目录
- **当** 执行技能目录扫描
- **则** 返回 `dirs` 为实际子目录列表
- **并且** `error` 为空或不存在

### Requirement: 上层加载流程不得吞并目录读取错误语义 [ADDED]

`loadBuiltinSkills` 与 `loadUserSkills` 等调用方在使用扫描结果时，必须保留错误语义（用于日志、诊断或上层返回值），不得将“读取失败”与“目录为空”混同。

#### Scenario: SLE-S4 加载流程区分 empty 与 failed [ADDED]

- **假设** 扫描结果为 `{ dirs: [], error: { code: "ENOENT", path: "/x" } }`
- **当** 上层执行技能加载流程
- **则** 上层输出保留 `ENOENT` 失败语义
- **并且** 不以“空技能列表”作为唯一结论

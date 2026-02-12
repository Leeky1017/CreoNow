# Version Control Specification Delta

## Change: version-control-p4-hardening-boundary

### Requirement: 模块级可验收标准 [MODIFIED]

- 快照写入 p95 < 120ms。
- 历史列表查询 p95 < 200ms。
- 两版本 Diff 计算 p95 < 350ms。
- 分支合并（无冲突）p95 < 900ms。
- TypeScript strict + zod，`version:*`/`version:branch:*`/`version:conflict:*` 通道必须由 zod 校验。
- 数据一致性失败一律硬失败并阻断。
- 可重试 IO 失败最多 3 次，超时 5s。
- 失败后返回结构化错误并记录 rollback checkpoint。

#### Scenario: 快照与 Diff 指标达标 [ADDED]

- **假设** 文档大小 30,000 字，历史版本 500 条
- **当** 连续执行 100 次快照与 100 次 Diff
- **则** 快照写入 p95 < 120ms
- **并且** Diff 计算 p95 < 350ms

#### Scenario: 数据库故障时保持可恢复状态 [ADDED]

- **假设** 快照写入中途 SQLite 抛错
- **当** 主进程处理异常
- **则** 返回 `{ code: "DB_ERROR", message: "版本写入失败" }`
- **并且** 文档保持写前状态且存在可回滚检查点

### Requirement: 异常与边界覆盖矩阵 [MODIFIED]

| 类别         | 最低覆盖要求                                 |
| ------------ | -------------------------------------------- |
| 网络/IO 失败 | 快照写入失败、历史读取失败、合并结果写入失败 |
| 数据异常     | 快照损坏、Diff 输入非法、分支 head 缺失      |
| 并发冲突     | 同文档双分支并发合并、并发回滚               |
| 容量溢出     | 单文档快照超过 50,000 条                     |
| 权限/安全    | 非当前项目分支访问、跨项目快照读取越权       |

#### Scenario: 并发合并触发串行锁 [ADDED]

- **假设** 两个请求同时将不同分支合并到 `main`
- **当** 请求同时到达主进程
- **则** 按 `documentId` 加锁串行执行
- **并且** 后到请求读取前一次合并后的最新 head 再计算

#### Scenario: 快照容量超限自动压缩 [ADDED]

- **假设** 单文档快照数量达到 50,001
- **当** 新快照写入
- **则** 自动压缩 7 天前 autosave 快照，保留手动/AI/回滚快照
- **并且** 返回 `VERSION_SNAPSHOT_COMPACTED` 事件供 UI 展示

### Non-Functional Requirements [MODIFIED]

#### Scenario: 多文档并行版本操作 [ADDED]

- **假设** 8 个文档同时触发快照
- **当** 版本服务并行处理
- **则** 所有请求在 p95 阈值内完成
- **并且** 各文档快照序列保持单调递增

#### Scenario: 超大 Diff 输入分块处理 [ADDED]

- **假设** 用户对比两版总文本 3 MB
- **当** 触发 `version:diff`
- **则** 返回 `{ code: "VERSION_DIFF_PAYLOAD_TOO_LARGE" }` 并提示启用分块对比
- **并且** 不发生主进程崩溃或 UI 卡死

## Out of Scope

- 不新增功能特性
- 不修改已通过的外部行为契约

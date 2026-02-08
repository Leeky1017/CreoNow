# Document Management Specification Delta

## Change: document-management-p2-hardening-and-gates

### Requirement: 大文件、编码异常与并发编辑冲突处理 [ADDED]

系统必须在文档读写/导入导出链路中提供可判定的硬化保护，覆盖容量、编码、并发与路径安全边界。

硬化基线：

- 容量上限：单文档内容（按 UTF-8 字节计）上限为 `5 MiB`。超过上限必须拒绝写入，并返回
  `{ ok: false, code: "DOCUMENT_CAPACITY_LIMIT_EXCEEDED", message }`。
- 编码异常：仅接受可被 UTF-8 成功解码的输入（允许 BOM 并归一化）。解码失败或非法编码必须返回
  `{ ok: false, code: "DOCUMENT_ENCODING_INVALID", message }`。
- 并发冲突：写入请求必须携带 `baseRevision`（或等价版本戳）；若与当前版本不一致，必须返回
  `{ ok: false, code: "DOCUMENT_CONFLICT_DETECTED", message, latestRevision }`。
- 路径越权阻断：文件读写目标路径经规范化后必须位于项目根目录内；`../` 路径穿越或符号链接逃逸必须返回
  `{ ok: false, code: "DOCUMENT_PATH_TRAVERSAL_BLOCKED", message }`。
- 任一错误路径均禁止 silent failure，必须返回可判定结果。

#### Scenario: 超容量文档写入被阻断并返回容量错误码 [ADDED]

- **假设** 用户尝试保存一个编码后大小超过 `5 MiB` 的文档
- **当** 系统执行 `file:document:save`
- **则** 请求被拒绝并返回 `DOCUMENT_CAPACITY_LIMIT_EXCEEDED`
- **并且** 已持久化内容保持不变，不产生部分写入

#### Scenario: 编码异常输入被拒绝并返回可判定错误 [ADDED]

- **假设** 文档输入包含无法按 UTF-8 解码的字节序列
- **当** 系统执行文档保存或导入
- **则** 请求失败并返回 `DOCUMENT_ENCODING_INVALID`
- **并且** 错误响应包含可读 `message`，不触发隐式兜底转换

#### Scenario: 并发编辑冲突返回最新版本元信息 [ADDED]

- **假设** 用户 A 与用户 B 基于同一旧版本同时编辑文档
- **当** 用户 A 先成功保存，用户 B 再以过期 `baseRevision` 保存
- **则** 用户 B 的请求返回 `DOCUMENT_CONFLICT_DETECTED`
- **并且** 响应包含 `latestRevision` 供冲突解决流程使用

#### Scenario: 路径越权访问被阻断 [ADDED]

- **假设** 请求目标路径包含 `../` 或通过符号链接指向项目根目录外
- **当** 系统执行文档读写或导出
- **则** 请求被拒绝并返回 `DOCUMENT_PATH_TRAVERSAL_BLOCKED`
- **并且** 系统不对越权路径执行任何文件操作

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement） [ADDED]

Document Management 模块所有 Requirement 在交付前必须通过统一门禁，且门禁必须具备可执行验证位。

门禁阈值（必须可测）：

| 维度     | 阈值                                                                                             | 失败结果                                  |
| -------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 容量阈值 | `<= 5 MiB` 允许；`> 5 MiB` 拒绝                                                                  | `DOCUMENT_CAPACITY_LIMIT_EXCEEDED`        |
| 性能阈值 | 在 `<= 1 MiB` 文档集下，`file:document:read` `p95 <= 120ms`，`file:document:save` `p95 <= 200ms` | `DOCUMENT_PERFORMANCE_THRESHOLD_EXCEEDED` |
| 队列背压 | 写入队列待处理任务 `> 32` 时，新增请求须在 `<= 50ms` 内拒绝                                      | `DOCUMENT_QUEUE_BACKPRESSURE`             |
| 路径安全 | 任意文件路径越权尝试 100% 阻断                                                                   | `DOCUMENT_PATH_TRAVERSAL_BLOCKED`         |

可执行验证位（基线命令）：

- `pnpm -C apps/desktop exec vitest run apps/desktop/tests/integration/document-management/hardening-capacity-and-encoding.test.ts`
- `pnpm -C apps/desktop exec vitest run apps/desktop/tests/integration/document-management/hardening-conflict-and-path-guard.test.ts`
- `pnpm -C apps/desktop exec vitest run apps/desktop/tests/integration/document-management/hardening-performance-and-backpressure.test.ts`
- `pnpm -C apps/desktop exec vitest run apps/desktop/tests/integration/document-management/hardening-matrix-coverage.test.ts`

#### Scenario: 容量与性能阈值具备可执行门禁 [ADDED]

- **假设** 集成测试基线已准备固定数据集（文档大小 `<= 1 MiB`）
- **当** 执行性能门禁测试套件
- **则** `read/save` 的 p95 延迟满足阈值
- **并且** 若超阈值，返回 `DOCUMENT_PERFORMANCE_THRESHOLD_EXCEEDED` 并阻断验收

#### Scenario: 队列背压触发与恢复可验证 [ADDED]

- **假设** 系统写入队列被并发请求填满至上限以上
- **当** 新写入请求到达
- **则** 请求在 `<= 50ms` 内返回 `DOCUMENT_QUEUE_BACKPRESSURE`
- **并且** 队列回落到安全水位后，请求可恢复受理

#### Scenario: 路径越权阻断纳入模块级验收门禁 [ADDED]

- **假设** 验收测试注入多类越权路径样本（路径穿越、符号链接逃逸）
- **当** 执行读写/导出路径校验
- **则** 所有越权样本均返回 `DOCUMENT_PATH_TRAVERSAL_BLOCKED`
- **并且** 任一未拦截样本均判定门禁失败

### Requirement: 异常与边界覆盖矩阵 [ADDED]

必须维护文档管理模块的异常与边界覆盖矩阵，并保证矩阵具备“可追踪、可执行、可判定”三项属性。

覆盖矩阵最小集合（不得删减）：

| 边界/异常类别 | 触发条件             | 预期错误码                                | 恢复策略                   | Scenario 绑定                   |
| ------------- | -------------------- | ----------------------------------------- | -------------------------- | ------------------------------- |
| 容量上限      | 文档字节数 `> 5 MiB` | `DOCUMENT_CAPACITY_LIMIT_EXCEEDED`        | 保留原内容 + 提示分片/精简 | `DM-P2-HG-S1`                   |
| 编码异常      | 非 UTF-8 可解码输入  | `DOCUMENT_ENCODING_INVALID`               | 拒绝写入 + 提示重新编码    | `DM-P2-HG-S2`                   |
| 并发冲突      | `baseRevision` 过期  | `DOCUMENT_CONFLICT_DETECTED`              | 拉取最新版本后合并重试     | `DM-P2-HG-S3`                   |
| 性能超阈      | p95 超过规定门限     | `DOCUMENT_PERFORMANCE_THRESHOLD_EXCEEDED` | 阻断验收并定位瓶颈         | `DM-P2-GATE-S1`                 |
| 队列背压      | 待处理写入 `> 32`    | `DOCUMENT_QUEUE_BACKPRESSURE`             | 快速失败 + 降载重试        | `DM-P2-GATE-S2`                 |
| 路径越权      | 路径穿越/链接逃逸    | `DOCUMENT_PATH_TRAVERSAL_BLOCKED`         | 阻断访问 + 安全告警        | `DM-P2-HG-S4` / `DM-P2-GATE-S3` |

#### Scenario: 异常与边界覆盖矩阵完整性可验证 [ADDED]

- **假设** 模块维护上述最小矩阵集合
- **当** 执行矩阵完整性测试
- **则** 每一行都必须绑定至少一个 Scenario 与测试用例
- **并且** 缺失任何一行都判定为验收失败

#### Scenario: 错误码与恢复策略一致性可验证 [ADDED]

- **假设** 模块进入任一异常路径
- **当** 验证错误响应与恢复策略
- **则** 响应必须包含 `{ ok: false, code, message }`
- **并且** `code` 必须与覆盖矩阵定义一致且存在对应恢复策略

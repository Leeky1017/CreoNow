# Project Management Specification Delta

## Change: project-management-p1-lifecycle-switch-delete

### Dependency

本 change 依赖 `project-management-p0-creation-metadata-dashboard` 已合并到控制面 `main`。未满足依赖前不得进入实现阶段。

### Requirement: 多项目切换 [MODIFIED]

`project:switch` 必须在切换前 flush 当前项目 pending autosave；切换耗时超过 1 秒时必须展示顶部 2px 进度条。切换流程中需调用 KG/MS 上下文切换预留接口，当前阶段使用 mock/no-op。

`project:switch` 契约：

- 请求：`{ projectId: string, operatorId: string, fromProjectId: string, traceId: string }`
- 响应成功：`{ ok: true, data: { currentProjectId: string, switchedAt: string } }`
- 响应失败：`{ ok: false, error: { code, message, traceId } }`

#### Scenario: 切换项目前先保存当前未落盘内容 [MODIFIED]

- **假设** 用户在项目 A 编辑，存在 pending autosave
- **当** 用户触发切换到项目 B
- **则** 系统先完成 autosave flush，再执行 `project:switch`
- **并且** KG/MS context hook 被调用（mock/no-op），最终编辑器加载项目 B

#### Scenario: 切换超过 1 秒显示加载指示并在完成后消失 [MODIFIED]

- **假设** 目标项目数据较大
- **当** `project:switch` 耗时超过 1 秒
- **则** 顶部显示 2px 进度条动画
- **并且** 切换完成后进度条消失

### Requirement: 项目删除 [MODIFIED]

项目删除必须要求用户手动输入项目名称二次确认。仅在名称完全匹配时允许提交删除请求。

#### Scenario: 名称匹配后确认删除项目 [MODIFIED]

- **假设** 用户在删除确认对话框中看到目标项目名与文档数量
- **当** 用户输入完整项目名称并确认
- **则** 系统执行删除流程并返回结构化成功响应
- **并且** Dashboard 列表刷新且目标项目卡片消失

#### Scenario: 名称不匹配时删除被阻断 [MODIFIED]

- **假设** 删除确认要求输入项目名
- **当** 用户输入不完整或不匹配名称
- **则** 「确认删除」按钮保持禁用
- **并且** 不发出删除 IPC 请求

### Requirement: 项目生命周期闭环 [MODIFIED]

生命周期状态机固定为 `active -> archived -> deleted`，并支持 `archived -> active` 恢复。状态转换必须由代码级状态机执行（transition map + guard），禁止散落式 `if/else`。

生命周期 IPC：

| IPC 通道                | 请求 schema（Zod）                 | 响应 schema（Zod）                  |
| ----------------------- | ---------------------------------- | ----------------------------------- |
| `project:archive`       | `ProjectArchiveRequestSchema`      | `ProjectArchiveResponseSchema`      |
| `project:restore`       | `ProjectRestoreRequestSchema`      | `ProjectRestoreResponseSchema`      |
| `project:purge`         | `ProjectPurgeRequestSchema`        | `ProjectPurgeResponseSchema`        |
| `project:lifecycle:get` | `ProjectLifecycleGetRequestSchema` | `ProjectLifecycleGetResponseSchema` |

#### Scenario: 归档后恢复并保持项目统计一致 [MODIFIED]

- **假设** 项目处于 `active` 且包含文档与统计数据
- **当** 用户执行 `project:archive` 后再执行 `project:restore`
- **则** 状态依次变更为 `archived`、`active`
- **并且** 文档与统计数据在恢复后保持一致

#### Scenario: 活跃项目直接永久删除被阻断 [MODIFIED]

- **假设** 项目状态为 `active`
- **当** 用户触发永久删除
- **则** 系统返回 `{ ok: false, error: { code: "PROJECT_DELETE_REQUIRES_ARCHIVE", message: "请先归档项目再删除", traceId } }`
- **并且** 不执行任何物理删除

### Requirement: 模块级可验收标准（PM-2 适用子集） [MODIFIED]

PM-2 覆盖范围必须满足：

- `project:switch` p95 < 1s，p99 < 2s
- `project:archive` p95 < 600ms
- `project:restore` p95 < 800ms
- `project:purge` p95 < 2s（项目规模 <= 1,000 文档）

#### Scenario: 切换与生命周期阈值建立 benchmark 基线 [MODIFIED]

- **假设** 在固定数据集下执行性能基线测试
- **当** 连续执行 `project:switch`、`project:archive`、`project:restore`、`project:purge`
- **则** 生成基线报告并校验上述 p95/p99 阈值
- **并且** 基线结果纳入回归测试输入

### Requirement: 异常与边界覆盖矩阵（PM-2 相关） [MODIFIED]

PM-2 必须覆盖并发冲突、权限/安全、网络/IO 失败。

#### Scenario: 两窗口并发删除同一项目的幂等冲突处理 [MODIFIED]

- **假设** 两个窗口同时对同一归档项目触发 `project:purge`
- **当** 第一请求已成功删除后第二请求到达
- **则** 第二请求返回 `{ ok: false, error: { code: "NOT_FOUND", message: "项目已删除", traceId } }`
- **并且** 不产生重复删除副作用

#### Scenario: 文件系统权限不足时阻断 purge [MODIFIED]

- **假设** 项目目录所在路径无写权限
- **当** 用户执行 `project:purge`
- **则** 返回 `{ ok: false, error: { code: "PROJECT_PURGE_PERMISSION_DENIED", message: "删除失败，路径无写权限", traceId } }`
- **并且** 生命周期状态保持 `archived`

#### Scenario: 数据库写入失败时返回结构化错误码 [MODIFIED]

- **假设** 生命周期状态写入数据库失败
- **当** 用户执行 `project:archive` 或 `project:restore`
- **则** 返回 `{ ok: false, error: { code: "PROJECT_LIFECYCLE_WRITE_FAILED", message, traceId } }`
- **并且** 失败被写入主进程日志，不允许 silent failure

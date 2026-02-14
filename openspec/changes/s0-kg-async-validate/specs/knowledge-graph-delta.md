# Knowledge Graph Specification Delta

## Change: s0-kg-async-validate

### Requirement: KG Panel 异步写入必须校验结果并可观测化失败 [ADDED]

Knowledge Graph 面板中，所有会改变持久化状态或关键 UI 状态的异步写入调用必须检查 `ServiceResult.ok`。失败不得被当作成功路径继续执行，并且必须向用户或日志暴露失败事实（至少一种）。

#### Scenario: KG-S0-AV-S1 relationDelete 失败不得清空编辑态 [ADDED]

- **假设** 用户正在编辑某条关系（`editing.mode === "relation"` 且 `editing.relationId` 为目标关系）
- **当** 用户触发删除关系且 `relationDelete` 返回 `ok:false`（或请求 reject）
- **则** 系统不得将编辑态强制切换为 idle（不得“假装删除成功”）
- **并且** 必须提示/记录删除失败（复用既有错误提示机制）

#### Scenario: KG-S0-AV-S2 entityUpdate 失败不得保存视图偏好 [ADDED]

- **假设** 用户触发实体更新后会执行视图偏好保存（例如 `saveKgViewPreferences`）
- **当** `entityUpdate` 返回 `ok:false`（或请求 reject）
- **则** 系统不得执行视图偏好保存的后续副作用
- **并且** 必须提示/记录更新失败

#### Scenario: KG-S0-AV-S3 批量 entityUpdate 必须 allSettled 并汇报部分失败 [ADDED]

- **假设** 用户触发批量实体更新，目标实体数为 N
- **当** 部分 `entityUpdate` 失败（`ok:false` 或 reject），其余成功
- **则** 系统必须使用 `Promise.allSettled`（或等价策略）等待所有结果，且不得因单点失败导致整体行为不确定
- **并且** 成功的更新必须生效，失败的更新必须被统计并向用户/日志汇报（例如 “k/N 个实体更新失败”）

## Out of Scope

- 引入新的通用异步任务框架、队列或重试策略。
- 修改 IPC schema、错误码体系或 KG 数据层结构。

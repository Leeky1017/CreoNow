# Rulebook Delta: issue-530-s0-kg-async-validate

## Requirement: KG 异步写入失败不得继续成功副作用

当 `KnowledgeGraphPanel` 的异步写入返回 `ok:false` 或发生 reject 时，系统不得继续执行成功路径副作用（编辑态清空、偏好保存等），并必须输出失败可观测信息。

#### Scenario: relationDelete 失败不清空编辑态

- Given 当前 relation 处于编辑态
- When 删除 relation 返回 `ok:false` 或 reject
- Then 编辑态保持不变
- And 失败被记录（日志或错误通道）

#### Scenario: entityUpdate 失败不写入偏好

- Given 节点移动触发 `entityUpdate`
- When 返回 `ok:false` 或 reject
- Then 不写入 `lastDraggedNodeId` 偏好
- And 失败被记录

#### Scenario: timeline 批量更新部分失败可观测

- Given timeline 重排触发 N 次 `entityUpdate`
- When 其中部分请求 `ok:false` 或 reject
- Then 使用 `Promise.allSettled` 等待所有结果
- And 输出 `k/N` 失败统计并保留成功项效果

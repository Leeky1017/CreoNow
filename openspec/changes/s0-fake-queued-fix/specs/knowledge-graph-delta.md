# Knowledge Graph Specification Delta

## Change: s0-fake-queued-fix

### Requirement: 空内容识别请求不得伪造队列任务 [ADDED]

知识图谱识别入口在接收空内容时，必须返回“跳过（skipped）”语义，且不得生成任何伪造任务标识。系统必须保证调用方可区分“真实入队任务”与“未入队跳过结果”。

#### Scenario: 空内容请求返回 skipped 且 taskId 为 null [ADDED]

- **假设** 调用方执行 `enqueueRecognition`，输入 `contentText` 归一化后长度为 `0`
- **当** 主进程处理识别请求
- **则** 返回结果保持 `ok: true`
- **并且** `data.status` 必须为 `"skipped"`（不得为 `"queued"`）
- **并且** `data.taskId` 必须为 `null`
- **并且** `data.queuePosition` 必须为 `0`

#### Scenario: 空内容分支不触发可取消任务语义 [ADDED]

- **假设** 调用方收到空内容识别结果且 `taskId` 为 `null`
- **当** 调用方执行后续任务追踪/取消判断
- **则** 系统将该结果视为“未入队”而非“运行中任务”
- **并且** 不得向不存在的任务 ID 发起取消或追踪操作

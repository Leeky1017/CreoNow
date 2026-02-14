# 提案：s0-fake-queued-fix

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint0（A3-C-001）指出：`kgRecognitionRuntime.ts` 在空内容输入时返回 `ok: true + status: "queued" + randomUUID taskId`，但实际并未入队，属于“表面正确、结果错误”的伪造输出。该行为会误导下游取消/追踪链路，把不存在的任务当作真实任务处理。

## 变更内容

- 将空内容识别请求的返回语义从“伪 queued”修正为“明确 skipped”。
- 禁止为空内容分支生成伪造 `taskId`，改为 `taskId: null`。
- 在测试层补齐 Scenario 覆盖，确保空内容分支不再伪造队列状态。

## 受影响模块

- Knowledge Graph（`apps/desktop/main/src/services/kg/`）— 识别入队返回契约修正。
- Knowledge Graph 测试（`apps/desktop/main/src/services/kg/__tests__/`）— 新增空内容行为断言。

## 依赖关系

- 上游依赖：无（Sprint0 并行组 A，独立项）。
- 横向关注：`enqueueRecognition` 调用链中基于 `taskId` 的取消/追踪逻辑需要兼容 `null`。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint0 `s0-fake-queued-fix` 条目；
  - `openspec/specs/knowledge-graph/spec.md` 中“自动识别与建议添加”行为要求。
- 核对项：
  - 返回状态语义：空内容必须表达为“跳过”而非“已入队”；
  - 数据契约：空内容分支 `taskId` 允许为 `null`；
  - 测试契约：Scenario 对应测试名与文件路径可追踪。
- 结论：`NO_DRIFT`（与当前 Sprint0 路线图一致，可进入规格编写与后续 Red 阶段）。

## 不做什么

- 不改动真实队列调度与任务生命周期实现。
- 不改动 UI 展示或新增提示文案。
- 不在本 change 引入新的状态枚举或跨模块协议变更。

## 审阅状态

- Owner 审阅：`PENDING`

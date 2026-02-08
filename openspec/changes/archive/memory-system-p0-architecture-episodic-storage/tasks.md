## 1. Specification

- [x] 1.1 审阅并确认 MS-1 覆盖 Requirement：三层架构 / 情景记录 / 存储淘汰
- [x] 1.2 审阅并确认隐式反馈 6 信号权重、预算阈值、调度接口边界
- [x] 1.3 审阅并确认异常范围：写入失败、容量溢出

## 2. TDD Mapping（先测前提）

- [x] 2.1 建立 Scenario→测试映射并写入测试文件注释（含 Scenario ID）
- [x] 2.2 为 IPC 契约（record/query）建立成功路径与失败路径测试映射
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.4 完成依赖同步检查（Dependency Sync Check）：本 change 为串行首项，无上游依赖（NO_DRIFT）

### Scenario → Test 映射

- [x] MS1-R1-S1 → `apps/desktop/tests/unit/memory/memory-layer-assembly.test.ts`
- [x] MS1-R1-S2 → `apps/desktop/tests/unit/memory/working-memory-budget.test.ts`
- [x] MS1-R1-S3 → `apps/desktop/tests/unit/memory/session-archive.test.ts`
- [x] MS1-R2-S1 → `apps/desktop/tests/unit/memory/episode-recording.test.ts`
- [x] MS1-R2-S2 → `apps/desktop/tests/unit/memory/implicit-feedback.test.ts`
- [x] MS1-R2-S3 → `apps/desktop/tests/integration/memory/episode-query-mixed-recall.test.ts`
- [x] MS1-R3-S1 → `apps/desktop/tests/integration/memory/storage-eviction.test.ts`
- [x] MS1-R3-S2 → `apps/desktop/tests/unit/memory/retrieval-fallback.test.ts`
- [x] MS1-X-S1 → `apps/desktop/tests/integration/memory/episode-write-retry.test.ts`
- [x] MS1-X-S2 → `apps/desktop/tests/integration/memory/capacity-overflow.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写并运行工作记忆预算与淘汰失败测试（预期失败）
- [x] 3.2 编写并运行 episode 记录/查询失败测试（预期失败）
- [x] 3.3 编写并运行异常路径失败测试（IO 失败、容量溢出）并记录证据

## 4. Green（最小实现通过）

- [x] 4.1 实现最小数据结构与 SQLite schema 使 Red 转绿
- [x] 4.2 实现隐式反馈纯函数与 IPC 通道最小闭环
- [x] 4.3 实现手动调度触发接口与预算校验

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离可复用的预算/淘汰策略组件，避免重复逻辑
- [x] 5.2 统一错误码与日志字段，保证跨 IPC 可观测
- [x] 5.3 保持全部测试绿灯并复核性能阈值断言

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 TDD 证据（Scenario 映射、Red 失败输出、Green 通过输出）
- [x] 6.2 记录关键命令与性能统计结果（含 p95 指标）

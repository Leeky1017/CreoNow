## 1. Specification

- [x] 1.1 审阅并确认 `s3-trace-persistence` 范围：trace 主记录与 feedback 关联持久化
- [x] 1.2 审阅并确认失败路径：trace/feedback 写入失败时的可观测降级
- [x] 1.3 审阅并确认不可变契约：AI 结果返回契约保持稳定，`traceId` 可追踪
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check），记录“无漂移/已更新”；无上游依赖时标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S3-TRACE-S1 `AI 生成完成后持久化 trace 并返回可追踪 traceId [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/ai/__tests__/traceStore.test.ts`
  - 测试名：`persists generation trace and returns traceId`
- [x] S3-TRACE-S2 `trace feedback 与 traceId 建立稳定关联 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/ai/__tests__/traceStore.feedback.test.ts`
  - 测试名：`stores feedback with valid trace linkage`
- [x] S3-TRACE-S3 `trace 持久化失败时输出结构化降级信号 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/ai/__tests__/aiService.trace-persistence.test.ts`
  - 测试名：`emits structured degradation signal when trace persistence fails`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-TRACE-S1 失败测试，确认当前 trace 未稳定落库
- [x] 3.2 编写 S3-TRACE-S2 失败测试，确认 feedback 关联路径缺失或不稳定
- [x] 3.3 编写 S3-TRACE-S3 失败测试，确认失败可观测语义缺失
- [x] 3.4 运行最小测试集并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 实现 trace 与 feedback 表 migration 及 `traceStore` 最小接口
- [x] 4.2 在 AI 运行完成链路写入 trace 并返回可追踪标识
- [x] 4.3 为持久化失败路径增加结构化降级输出

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛 trace 写入与反馈写入的共享校验逻辑
- [x] 5.2 清理重复日志与分支，保持失败路径一致语义

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 trace/feedback 实际落库与失败降级验证证据

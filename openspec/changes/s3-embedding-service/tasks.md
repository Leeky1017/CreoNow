## 1. Specification

- [x] 1.1 审阅并确认 `s3-embedding-service` 边界：仅统一 embedding 服务编排与降级语义。
- [x] 1.2 审阅并确认错误路径：primary 超时、provider 不可用、fallback 禁用三类路径均需显式可观测。
- [x] 1.3 审阅并确认验收阈值：保持 IPC 契约稳定，禁止静默成功与隐式降级。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（对齐 `s3-onnx-runtime`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [x] `S3-ES-S1`：`apps/desktop/main/src/services/embedding/__tests__/embedding-service.primary.test.ts` → `returns embedding from primary provider without fallback warning`
- [x] `S3-ES-S2`：`apps/desktop/main/src/services/embedding/__tests__/embedding-service.fallback.test.ts` → `falls back with structured warning when primary provider times out`
- [x] `S3-ES-S3`：`apps/desktop/main/src/services/embedding/__tests__/embedding-service.fallback.test.ts` → `returns EMBEDDING_PROVIDER_UNAVAILABLE when fallback is disabled`

## 3. Red（先写失败测试）

- [x] 3.1 新增 `S3-ES-S1` 失败测试，验证当前缺少统一 service 编排。
- [x] 3.2 新增 `S3-ES-S2` 失败测试，验证 fallback warning 结构尚未满足。
- [x] 3.3 新增 `S3-ES-S3` 失败测试，验证 fallback 禁用时的显式失败语义。
- [x] 3.4 运行最小测试集并记录 Red 证据（命令 + 失败输出）。

## 4. Green（最小实现通过）

- [x] 4.1 落地 Embedding Service 最小编排逻辑，使 `S3-ES-S1/S2/S3` 转绿。
- [x] 4.2 实现显式 fallback 配置与统一错误码映射。
- [x] 4.3 复跑 Scenario 对应测试并确认通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 去重调用方的 provider 选择分支，统一收敛到 service 层。
- [x] 5.2 统一 warning/error payload 字段，防止日志与 IPC 风格漂移。
- [x] 5.3 回归受影响 RAG/embedding 测试，确认行为契约无回归。

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作。
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

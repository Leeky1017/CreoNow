## 1. Specification

- [ ] 1.1 审阅并确认 `s3-onnx-runtime` 边界：仅落地 ONNX Runtime 运行时底座，不扩展检索策略。
- [ ] 1.2 审阅并确认错误路径：初始化失败、模型加载失败、向量维度不匹配均需显式错误语义。
- [ ] 1.3 审阅并确认验收阈值：保持现有 IPC 契约，对外行为仅增强稳定性与可观测性。
- [ ] 1.4 执行依赖同步检查（Dependency Sync Check）并记录结论（本 change 预期 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [ ] `S3-ONNX-S1`：`apps/desktop/main/src/services/embedding/__tests__/onnx-runtime.init.test.ts` → `initializes onnx runtime and generates embedding with expected dimension`
- [ ] `S3-ONNX-S2`：`apps/desktop/main/src/services/embedding/__tests__/onnx-runtime.error.test.ts` → `returns EMBEDDING_RUNTIME_UNAVAILABLE when model load fails`
- [ ] `S3-ONNX-S3`：`apps/desktop/main/src/services/embedding/__tests__/onnx-runtime.error.test.ts` → `rejects dimension mismatch with deterministic error code`

## 3. Red（先写失败测试）

- [ ] 3.1 新增 `S3-ONNX-S1` 失败测试，验证当前实现尚未满足 ONNX 运行时约束。
- [ ] 3.2 新增 `S3-ONNX-S2` 失败测试，验证模型加载失败语义。
- [ ] 3.3 新增 `S3-ONNX-S3` 失败测试，验证维度校验失败语义。
- [ ] 3.4 运行最小测试集并记录 Red 证据（命令 + 失败输出）。

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现 ONNX 运行时最小初始化与推理流程，使 Red 用例转绿。
- [ ] 4.2 增加统一错误映射（初始化失败/维度错误）并保持 IPC 契约不变。
- [ ] 4.3 复跑 `S3-ONNX-S1/S2/S3` 对应测试并确认通过。

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重运行时配置与模型路径解析逻辑，保持单一来源。
- [ ] 5.2 统一日志字段命名，避免 runtime 层与 IPC 层风格漂移。
- [ ] 5.3 回归受影响检索测试，确认外部行为契约未回归。

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

## 1. Specification

- [x] 1.1 审阅并确认 AI Panel 的 Mode/Model 仅 UI 生效问题边界
- [x] 1.2 审阅并确认 IPC `ai:skill:run` 契约扩展范围与回滚边界
- [x] 1.3 审阅并确认 Main AI Service 对 mode/model 的生效策略

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `AI Panel 运行请求携带 mode/model [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
  - 用例：`should include mode and model in ai:skill:run payload`
- [x] S2 `ai:skill:run 契约声明 mode/model 字段 [ADDED]`
  - 测试：`apps/desktop/tests/unit/contract-generate.validation.spec.ts`
  - 用例：`should keep ai:skill:run schema compatible with generated contract`
- [x] S3 `AI Service 上游请求使用面板选择模型 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-run-options.test.ts`
  - 用例：`should send selected model to upstream request body`
- [x] S4 `AI Service 对 plan 模式注入确定性 system 提示 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-run-options.test.ts`
  - 用例：`should append deterministic mode hint for plan mode`

## 3. Red（先写失败测试）

- [x] 3.1 编写并执行 `ai-store-run-request-options` 失败测试（断言缺少 mode/model）
- [x] 3.2 编写并执行 `ai-service-run-options` 失败测试（断言上游未使用 mode/model）
- [x] 3.3 记录 Red 失败输出到 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 扩展 IPC 契约并重新生成 `packages/shared/types/ipc-generated.ts`
- [x] 4.2 在 Renderer `AiPanel -> aiStore` 贯通 mode/model 请求参数
- [x] 4.3 在 Main `ipc/ai -> aiService` 贯通并生效 mode/model
- [x] 4.4 让新增 Red 用例转绿且不破坏既有 AI 运行链路

## 5. Refactor（保持绿灯）

- [x] 5.1 去重 mode/model 字面量类型，避免跨层硬编码漂移
- [x] 5.2 保持既有默认行为（ask + fake fallback）不变并维持测试全绿

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）— ISSUE-264.md 已完整记录，PR #275 全部 checks SUCCESS，已于 2026-02-08T08:39:20Z 自动合并

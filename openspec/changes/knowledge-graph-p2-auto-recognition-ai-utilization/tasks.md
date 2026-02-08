## 1. Specification

- [ ] 1.1 审阅并确认 KG-3 仅覆盖自动识别建议与 AI 续写 KG 利用
- [ ] 1.2 审阅并确认 KG-3 依赖 KG-2 合并后才可进入实现
- [ ] 1.3 审阅并确认异步触发、并发上限 4、mock 策略与跨项目访问安全边界

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] KG3-R1-S1 autosave 后自动识别新角色
  - 目标测试：`apps/desktop/tests/integration/kg/auto-recognition-autosave.test.ts`
  - 用例：`should trigger background recognition after autosave without blocking editor input`
- [ ] KG3-R1-S2 接受建议创建实体
  - 目标测试：`apps/desktop/tests/integration/kg/suggestion-accept-create-entity.test.ts`
  - 用例：`should create entity via knowledge:suggestion:accept and open entity detail`
- [ ] KG3-R1-S3 忽略建议同会话去重
  - 目标测试：`apps/desktop/tests/integration/kg/suggestion-dismiss-dedupe.test.ts`
  - 用例：`should suppress repeated suggestion in same session after dismiss`
- [ ] KG3-R1-S4 识别服务不可用静默降级
  - 目标测试：`apps/desktop/tests/unit/kg/recognition-silent-degrade.test.ts`
  - 用例：`should log recognition failure without toast and keep manual create available`
- [ ] KG3-R2-S1 续写注入角色设定
  - 目标测试：`apps/desktop/tests/integration/kg/kg-rules-injection.test.ts`
  - 用例：`should inject relevant entity settings into mocked rules layer payload`
- [ ] KG3-R2-S2 未填写设定避免胡编
  - 目标测试：`apps/desktop/tests/unit/kg/kg-rules-undefined-attributes-guard.test.ts`
  - 用例：`should inject only defined fields for sparse entities`
- [ ] KG3-R2-S3 KG 为空时续写降级
  - 目标测试：`apps/desktop/tests/integration/kg/kg-empty-rules-degrade.test.ts`
  - 用例：`should return empty injection result and continue compose flow`
- [ ] KG3-A-S1 并发识别背压不影响手动操作
  - 目标测试：`apps/desktop/tests/integration/kg/recognition-backpressure.test.ts`
  - 用例：`should keep max 4 concurrent recognition workers and preserve manual entity actions`
- [ ] KG3-X-S1 识别/查询失败降级
  - 目标测试：`apps/desktop/tests/integration/kg/recognition-query-failure-degrade.test.ts`
  - 用例：`should return structured codes and fallback to empty rules injection`
- [ ] KG3-X-S2 并发超限排队与取消
  - 目标测试：`apps/desktop/tests/integration/kg/recognition-queue-cancel.test.ts`
  - 用例：`should enqueue overflow tasks and allow cancellation while preserving order`
- [ ] KG3-X-S3 跨项目访问阻断
  - 目标测试：`apps/desktop/tests/integration/kg/query-cross-project-guard.test.ts`
  - 用例：`should reject cross-project entity access with KG_SCOPE_VIOLATION`

## 3. Red（先写失败测试）

- [ ] 3.1 先为 KG3-R1-S1~KG3-R1-S4 编写失败测试并确认 Red（自动识别建议）
- [ ] 3.2 再为 KG3-R2-S1~KG3-R2-S3 编写失败测试并确认 Red（续写注入契约）
- [ ] 3.3 最后为 KG3-A-S1 与 KG3-X-S1~KG3-X-S3 编写失败测试并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现自动识别异步链路与建议通道的最小闭环
- [ ] 4.2 仅实现 KG→Rules 注入 mock 接口与相关查询最小闭环
- [ ] 4.3 仅实现失败降级、并发背压与跨项目阻断所需最小行为

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离识别任务调度器与队列组件，统一并发控制逻辑
- [ ] 5.2 抽离 KG Rules 注入 adapter，确保后续 CE 真接入可替换
- [ ] 5.3 保持所有 Scenario 测试与错误码契约稳定

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Scenario 映射、Red 失败输出、Green 通过输出
- [ ] 6.2 记录关键命令输出（单测/集测/并发测试）与 mock 证明
- [ ] 6.3 记录 Rulebook validate、门禁检查与 PR 证据

## 0. 审阅状态

- Owner 审阅：`APPROVED`（2026-02-07）

## 1. Specification

- [x] 1.1 审阅并确认请求/响应双向校验边界
- [x] 1.2 审阅并确认错误码字典与映射优先级
- [x] 1.3 审阅并确认超时处理与清理责任边界

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `Request-Response 返回非 envelope 被判定为协议错误 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-runtime-validation.spec.ts` `should map non-envelope response to INTERNAL_ERROR and log protocol violation`
- [x] S2 `请求校验失败时业务逻辑不执行 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-runtime-validation.spec.ts` `should return VALIDATION_ERROR and skip handler execution when request payload is invalid`
- [x] S3 `响应校验失败时返回结构化错误 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-runtime-validation.spec.ts` `should return INTERNAL_ERROR when handler response data violates response schema`
- [x] S4 `未捕获异常统一映射为 INTERNAL_ERROR [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-runtime-validation.spec.ts` `should sanitize unknown thrown error into INTERNAL_ERROR without leaking stack`
- [x] S5 `超时触发后返回 IPC_TIMEOUT 并执行清理 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-runtime-validation.spec.ts` `should return IPC_TIMEOUT and invoke cleanup hook on timeout`

## 3. Red（先写失败测试）

- [x] 3.1 写“非法 request 拒绝且业务不执行”失败测试并确认先失败
- [x] 3.2 写“非法 response 被拦截并结构化返回”失败测试并确认先失败
- [x] 3.3 写“超时返回 IPC_TIMEOUT 且触发清理”失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 在主进程入口增加统一 request/response 校验中间层
- [x] 4.2 建立统一异常映射器，禁止原始异常透传渲染进程
- [x] 4.3 增加 request-response 超时控制与清理钩子，使 Red 用例转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛重复错误映射逻辑，保持测试全绿
- [x] 5.2 保持对外 envelope 结构与错误码语义不变

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（包含 Red 失败证据、Green 通过证据与命令输出）

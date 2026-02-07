## 0. 审阅状态

- Owner 审阅：`APPROVED`（2026-02-07）

## 1. Specification

- [x] 1.1 审阅并确认 Contract Registry 字段最小集合（channel/mode/direction/request/response/description）
- [x] 1.2 审阅并确认命名校验与重复校验的阻断策略
- [x] 1.3 审阅并确认 deterministic 生成与 CI 漂移阻断规则

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `新增通道仅通过契约注册表完成 [ADDED]`
  - 测试：`apps/desktop/tests/unit/contract-generate.validation.spec.ts` `should generate channels from contract registry when channel list changes`
- [x] S2 `绕过契约注册表直接绑定被阻断 [ADDED]`
  - 测试：`apps/desktop/tests/unit/contract-generate.validation.spec.ts` `should fail with IPC_CONTRACT_UNREGISTERED_BINDING when ipcMain.handle uses unregistered channel`
- [x] S3 `契约生成重复执行无差异 [ADDED]`
  - 测试：`apps/desktop/tests/unit/contract-generate.spec.ts` `deterministic output on repeated generation`
- [x] S4 `Request-Response 缺失 response schema 被稳定错误码阻断 [ADDED]`
  - 测试：`apps/desktop/tests/unit/contract-generate.validation.spec.ts` `should fail with IPC_CONTRACT_MISSING_SCHEMA when response schema is missing`
- [x] R1 `命名校验阻断策略`
  - 测试：`apps/desktop/tests/unit/contract-generate.validation.spec.ts` `should fail with IPC_CONTRACT_INVALID_NAME for malformed channel name`
- [x] R2 `重复通道阻断策略`
  - 测试：`apps/desktop/tests/unit/contract-generate.validation.spec.ts` `should fail with IPC_CONTRACT_DUPLICATED_CHANNEL for duplicate channel declarations`

## 3. Red（先写失败测试）

- [x] 3.1 写“生成脚本重复执行无差异”失败测试并确认先失败
- [x] 3.2 写“缺失 schema / 重复通道 / 非法命名”失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 建立 IPC 契约注册表并统一聚合导出
- [x] 4.2 实现 `contract-generate` 的 deterministic 输出
- [x] 4.3 在 CI 增加“生成后无差异”门禁，使 Red 用例转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 清理重复代码与命名，保持测试全绿
- [x] 5.2 保持对外行为与 Scenario 断言不变

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（包含 Red 失败证据、Green 通过证据与命令输出）

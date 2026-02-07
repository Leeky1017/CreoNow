## 1. Specification

- [ ] 1.1 审阅并确认 `通道命名规范` 的三段式强约束边界（`<domain>:<resource>:<action>`）
- [ ] 1.2 审阅并确认 domain 白名单与模块映射关系
- [ ] 1.3 审阅并确认命名违规错误码与定位信息的稳定契约

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] S1 `非白名单 domain 注册被阻断 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-channel-naming-governance.spec.ts`
  - 用例：`should fail with IPC_CONTRACT_UNKNOWN_DOMAIN when domain is not in registry`
- [ ] S2 `两段式通道命名被阻断 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-channel-naming-governance.spec.ts`
  - 用例：`should fail with IPC_CONTRACT_INVALID_NAME when channel has only two segments`
- [ ] S3 `method 名冲突被阻断 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-channel-naming-governance.spec.ts`
  - 用例：`should fail with IPC_CONTRACT_NAME_COLLISION when generated method names collide`
- [ ] S4 `命名违规返回可定位信息 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-channel-naming-governance.spec.ts`
  - 用例：`should include file path and channel in naming validation error details`

## 3. Red（先写失败测试）

- [ ] 3.1 编写“非白名单 domain 被阻断”失败测试并确认先失败
- [ ] 3.2 编写“两段式命名被阻断”失败测试并确认先失败
- [ ] 3.3 编写“method 名冲突被阻断”失败测试并确认先失败

## 4. Green（最小实现通过）

- [ ] 4.1 在 contract-generate 增加 domain 白名单校验
- [ ] 4.2 在命名校验中强制三段式并输出稳定错误码
- [ ] 4.3 增加 preload method 名冲突检测，使 Red 用例转绿

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛命名校验与错误组装逻辑，保持测试全绿
- [ ] 5.2 保持对外错误码语义与契约字段不变

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）

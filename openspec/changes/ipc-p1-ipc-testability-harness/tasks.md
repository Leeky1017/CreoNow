## 1. Specification

- [ ] 1.1 审阅并确认 `可测试性` requirement 的测试分层与依赖边界
- [ ] 1.2 审阅并确认 main/preload/push 三类 helper 的最小能力
- [ ] 1.3 审阅并确认 Scenario→测试映射清单的门禁策略

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] S1 `主进程 handler 单测不依赖 Electron runtime [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-testability.main.spec.ts`
  - 用例：`should execute handler unit tests with mock ipcMain only`
- [ ] S2 `Preload API 转发可精确断言 channel 与参数 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-testability.preload.spec.ts`
  - 用例：`should assert forwarded channel and payload through mock ipcRenderer`
- [ ] S3 `Push 订阅/退订可测试且无泄漏 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-testability.push.spec.ts`
  - 用例：`should release listener handles on unsubscribe`
- [ ] S4 `场景映射缺失触发门禁失败 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-testability.mapping.spec.ts`
  - 用例：`should fail when scenario id has no mapped test case`

## 3. Red（先写失败测试）

- [ ] 3.1 编写“main handler 无 Electron 依赖”失败测试并确认先失败
- [ ] 3.2 编写“preload 转发断言”失败测试并确认先失败
- [ ] 3.3 编写“scenario 映射缺失门禁”失败测试并确认先失败

## 4. Green（最小实现通过）

- [ ] 4.1 新增统一 IPC 测试 helper（main/preload/push）
- [ ] 4.2 接入 Scenario 映射校验并阻断缺失映射
- [ ] 4.3 让新增 Red 用例全部转绿

## 5. Refactor（保持绿灯）

- [ ] 5.1 合并重复 mock 逻辑，保持测试全绿
- [ ] 5.2 保持 helper API 稳定，避免测试调用方大面积改动

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）

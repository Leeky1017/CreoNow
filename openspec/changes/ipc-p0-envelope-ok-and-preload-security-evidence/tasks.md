## 1. Specification

- [x] 1.1 审阅并确认 envelope 规范字段统一为 `ok`
- [x] 1.2 审阅并确认 preload 安全 S2 的自动化证据要求（unit + E2E）
- [x] 1.3 审阅并确认 archived spec 回写范围与审计留痕要求

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `envelope 文档示例统一为 ok [MODIFIED]`
  - 测试：`apps/desktop/tests/unit/ipc-spec-envelope-wording.spec.ts`
  - 用例：`should use ok envelope wording in ipc main spec and targeted archived specs`
- [x] S2 `渲染进程无法获得 ipcRenderer 引用具备自动化证据 [MODIFIED]`
  - 测试：`apps/desktop/tests/unit/ipc-preload-exposure-security.spec.ts`
  - 用例：`should expose only creonow and __CN_E2E_ENABLED__ from preload bridge`
  - 测试：`apps/desktop/tests/e2e/app-launch.spec.ts`
  - 用例：`security: renderer cannot access ipcRenderer/require while creonow bridge remains available`

## 3. Red（先写失败测试）

- [x] 3.1 编写 envelope 文档一致性失败测试并确认先失败
- [x] 3.2 编写 preload 暴露白名单失败测试并确认先失败
- [x] 3.3 编写 E2E 安全断言失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 修改 spec 文案（主 spec + 指定 archived spec）使 S1 转绿
- [x] 4.2 最小化调整测试/预加载暴露实现使 S2 转绿
- [x] 4.3 将新单测接入 `test:unit` 显式命令链

## 5. Refactor（保持绿灯）

- [x] 5.1 去重与命名收敛，保持测试全绿
- [x] 5.2 保持生产 API 与运行时行为不变（无 `ok/success` 双栈）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）

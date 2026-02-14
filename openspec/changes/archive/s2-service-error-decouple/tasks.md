## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅做文档 service 错误语义与 IPC 映射解耦
- [x] 1.2 审阅并确认错误路径与边界路径：防止 service 继续依赖 `IpcError`
- [x] 1.3 审阅并确认验收阈值：service 返回 `DocumentError`，IPC 层完成映射且外部契约不变
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 需核对 `s1-ai-service-extract` 建议依赖

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID     | 测试文件                                                                           | 测试名称（拟定）                                              | 断言要点                          |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------- |
| `DOC-S2-SED-S1` | `apps/desktop/main/src/services/documents/__tests__/document-error-domain.test.ts` | `document service returns domain errors without ipc coupling` | service 错误类型不依赖 `IpcError` |
| `DOC-S2-SED-S2` | `apps/desktop/main/src/ipc/__tests__/document-error-mapping.test.ts`               | `ipc maps document domain errors into stable ipc envelope`    | IPC 映射后对外错误契约稳定        |

## 3. Red（先写失败测试）

- [x] 3.1 为 `DOC-S2-SED-S1` 编写失败测试，先证明当前 service 存在 IPC 错误类型耦合
- [x] 3.2 为 `DOC-S2-SED-S2` 编写失败测试，先锁定映射后对外契约要求
- [x] 3.3 运行对应测试并记录 Red 证据（失败输出与 Scenario ID 对应）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 `DOC-S2-SED-S1/S2` 转绿的最小改动（引入 `DocumentError` + IPC 映射）
- [x] 4.2 删除或替换 service 层残留 IPC 错误路径，保持单一路径

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛错误映射入口，避免重复映射逻辑分散
- [x] 5.2 校验类型命名与职责边界，防止领域与传输语义再次耦合

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

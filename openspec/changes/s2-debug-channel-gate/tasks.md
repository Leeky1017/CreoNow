## 1. Specification

- [ ] 1.1 审阅并确认需求边界：仅处理 `db:debug:tablenames` 的生产门禁
- [ ] 1.2 审阅并确认错误路径与边界路径：防止生产环境调试通道泄露结构信息
- [ ] 1.3 审阅并确认验收阈值：production 禁用、non-production 可用
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 标注为独立项

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID     | 测试文件                                                         | 测试名称（拟定）                                   | 断言要点                          |
| --------------- | ---------------------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| `IPC-S2-DBG-S1` | `apps/desktop/main/src/ipc/__tests__/debug-channel-gate.test.ts` | `does not register db debug channel in production` | production 下通道未注册/不可调用  |
| `IPC-S2-DBG-S2` | `apps/desktop/main/src/ipc/__tests__/debug-channel-gate.test.ts` | `registers db debug channel in non-production`     | non-production 下保持既有调试能力 |

## 3. Red（先写失败测试）

- [ ] 3.1 为 `IPC-S2-DBG-S1` 编写失败测试，先证明当前生产环境可暴露 debug 通道
- [ ] 3.2 为 `IPC-S2-DBG-S2` 编写失败测试，先锁定非生产环境可用性契约
- [ ] 3.3 运行对应测试并记录 Red 证据（失败输出与 Scenario ID 对应）

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 `IPC-S2-DBG-S1/S2` 转绿的最小改动（注册阶段环境门禁）
- [ ] 4.2 保持现有非生产调试链路行为不变

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛环境判断逻辑，避免同一通道出现多处不一致门禁
- [ ] 5.2 清理重复分支，保持注册链路可读性

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

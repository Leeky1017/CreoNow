## 1. Specification

- [ ] 1.1 审阅并确认需求边界：仅修复 `kgStore/searchStore` 请求竞态覆盖问题
- [ ] 1.2 审阅并确认错误路径与边界路径：防止旧请求回写覆盖最新状态
- [ ] 1.3 审阅并确认验收阈值：快速切换/快速输入场景下仅最新请求可提交结果
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 标注为独立项

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID    | 测试文件                                                              | 测试名称（拟定）                                             | 断言要点                           |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| `WB-S2-SRF-S1` | `apps/desktop/renderer/src/stores/__tests__/kgStore.race.test.ts`     | `ignores stale kg results after rapid project switch`        | 旧项目请求结果不得覆盖当前项目状态 |
| `WB-S2-SRF-S2` | `apps/desktop/renderer/src/stores/__tests__/searchStore.race.test.ts` | `prevents stale search results from overriding latest query` | 仅最新查询结果可写入 store         |

## 3. Red（先写失败测试）

- [ ] 3.1 编写 `WB-S2-SRF-S1` 失败测试，先证明项目快速切换存在旧结果覆盖
- [ ] 3.2 编写 `WB-S2-SRF-S2` 失败测试，先证明快速输入存在旧结果反写
- [ ] 3.3 运行对应测试并记录 Red 证据（失败输出与 Scenario ID 对应）

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 `WB-S2-SRF-S1/S2` 转绿的最小改动（请求标记/中断 + 提交前校验）
- [ ] 4.2 保持 store 对外接口不变，仅收敛内部并发写入策略

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一请求标记命名与提交流程，降低未来竞态复发概率
- [ ] 5.2 清理重复并发防护逻辑，保持 store 内部职责清晰

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

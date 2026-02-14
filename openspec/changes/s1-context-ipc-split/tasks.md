## 1. Specification

- [ ] 1.1 审阅并确认 `docs/plans/unified-roadmap.md` 中 `s1-context-ipc-split（A7-C-004）` 的范围边界：仅拆分 `registerContextIpcHandlers`，不改通道契约语义
- [ ] 1.2 审阅并确认前缀分组策略：`context:assemble/* + context:inspect/*`、`context:budget/*`、`context:fs/*` 的文件归属与注册边界
- [ ] 1.3 审阅并确认不可变契约：`context.ts` 只做聚合注册，子注册器不重复实例化依赖服务
- [ ] 1.4 进入 Red 前执行 依赖同步检查（Dependency Sync Check）：复核 `s1-break-context-cycle` 最新 `proposal/spec/tasks` 与当前分支代码状态，记录结论为 `无漂移` 或 `已更新`；若漂移，先更新本 change 文档再继续

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试，并为测试标注 Scenario ID（`SCIS-S1`/`SCIS-S2`/`SCIS-S3`）
- [ ] 2.2 建立“通道归属、聚合委托、实例化次数”三类断言，覆盖拆分后最小回归面
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.4 将 依赖同步检查（Dependency Sync Check） 的复核命令、输入与结论写入 RUN_LOG 后，方可开始 Red

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                 | 测试名称（拟定）                                                               | 断言要点                                                                                          |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `SCIS-S1`   | `apps/desktop/main/src/ipc/__tests__/contextIpcSplit.routing.test.ts`    | `registers channels by context prefix groups`                                  | `context:assemble/* + context:inspect/*`、`context:budget/*`、`context:fs/*` 只在对应子注册器注册 |
| `SCIS-S2`   | `apps/desktop/main/src/ipc/__tests__/contextIpcSplit.aggregator.test.ts` | `context.ts delegates registration to three sub-registrars`                    | `registerContextIpcHandlers` 仅做三段委托，不直接持有各通道 handler 实现                          |
| `SCIS-S3`   | `apps/desktop/main/src/ipc/__tests__/contextIpcSplit.deps.test.ts`       | `does not instantiate context services multiple times across split registrars` | 依赖实例由聚合层统一注入，子注册器不重复创建 service 实例                                         |

## 3. Red（先写失败测试）

- [ ] 3.1 编写 `SCIS-S1` 失败测试：当前实现未按前缀拆分时应触发失败
- [ ] 3.2 编写 `SCIS-S2` 失败测试：`context.ts` 若仍内联 handler 逻辑应触发失败
- [ ] 3.3 编写 `SCIS-S3` 失败测试：任一子注册器重复实例化依赖服务应触发失败
- [ ] 3.4 运行最小测试集并记录 Red 证据（失败输出与 Scenario ID 对应关系）

## 4. Green（最小实现通过）

- [ ] 4.1 新增 `contextAssembly.ts`、`contextBudget.ts`、`contextFs.ts`，并按前缀迁移对应 handler 注册逻辑
- [ ] 4.2 修改 `context.ts` 为聚合注册器，仅保留三段注册委托与统一依赖注入
- [ ] 4.3 仅实现使 `SCIS-S1`/`SCIS-S2`/`SCIS-S3` 转绿的最小改动，不引入新通道或语义变更
- [ ] 4.4 复跑映射测试，确认全部 Green

## 5. Refactor（保持绿灯）

- [ ] 5.1 清理迁移过程中的重复校验与重复 helper，保持子注册器职责单一
- [ ] 5.2 复核导入边界，避免子注册器反向依赖聚合注册器导致新耦合
- [ ] 5.3 在绿灯保护下精简命名与注释，保持可读性与可追踪性

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 依赖同步检查（Dependency Sync Check）（输入、核对项、结论、漂移处置）
- [ ] 6.2 在 RUN_LOG 记录 Red/Green 关键命令、失败/通过输出与 Scenario 覆盖证明
- [ ] 6.3 在 RUN_LOG 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

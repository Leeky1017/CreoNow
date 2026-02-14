## 1. Specification

- [ ] 1.1 审阅并确认 `docs/plans/unified-roadmap.md` 中 `s1-kg-service-extract（A7-C-003）` 的边界：仅做 `query/write/types/facade` 拆分，不扩展业务能力。
- [ ] 1.2 审阅并确认 `openspec/changes/s1-kg-service-extract/specs/knowledge-graph-delta.md` 的 Requirement/Scenario 覆盖职责拆分、门面委托与关键导出可见性。
- [ ] 1.3 审阅并确认受影响模块（`services/kg` + `services/context` 消费方）与不做项，避免超范围实现。
- [ ] 1.4 完成 依赖同步检查（Dependency Sync Check） 并落盘结论（本 change 无硬依赖，建议在 `s1-path-alias` 后执行，结论预期为 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个可执行测试（职责边界、门面委托、导出可见性）。
- [ ] 2.2 为每个测试标注 Scenario ID（KG-S1-KSE-S1/S2/S3），建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。
- [ ] 2.4 明确运行命令与预期失败信号，并写入 RUN_LOG。

### Scenario → 测试映射

| Scenario ID  | 测试文件                                                                            | 测试名称（拟定）                                                                 | 断言要点                                                                                         |
| ------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| KG-S1-KSE-S1 | `apps/desktop/main/src/services/kg/__tests__/kg-service-split-boundary.test.ts`     | `query and write responsibilities are split into dedicated services`             | `kgQueryService` 仅暴露 query/injection 能力，`kgWriteService` 仅暴露 entity/relation 写路径能力 |
| KG-S1-KSE-S2 | `apps/desktop/main/src/services/kg/__tests__/kg-service-facade-delegation.test.ts`  | `kg facade delegates methods to query and write services without contract drift` | `createKnowledgeGraphService` 对外方法保持既有签名与 `ServiceResult` 包络，调用链委托到子服务    |
| KG-S1-KSE-S3 | `apps/desktop/main/src/services/kg/__tests__/kg-service-exports-visibility.test.ts` | `key exports remain visible after extraction`                                    | `types.ts` 与 `buildRulesInjection` 可从稳定路径导入，Context Engine 依赖不失效                  |

## 3. Red（先写失败测试）

- [ ] 3.1 编写 KG-S1-KSE-S1 失败测试，先验证当前单体结构下职责边界断言失败。
- [ ] 3.2 编写 KG-S1-KSE-S2 失败测试，先验证门面委托链路与契约保持断言失败。
- [ ] 3.3 编写 KG-S1-KSE-S3 失败测试，先验证关键导出路径可见性断言失败。
- [ ] 3.4 运行最小测试集并记录 Red 证据（失败输出与 Scenario ID 对应）。

## 4. Green（最小实现通过）

- [ ] 4.1 新增 `types.ts`、`kgQueryService.ts`、`kgWriteService.ts`，并完成 `kgService.ts` 门面委托改造。
- [ ] 4.2 仅实现使 KG-S1-KSE-S1/S2/S3 转绿的最小改动，不引入额外功能或契约变更。
- [ ] 4.3 按 Scenario 顺序逐条转绿并复跑映射测试，确认全部 Green。

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重提取过程中可能遗留的重复 helper/分叉逻辑，确保 `kgService.ts` 保持单一路径委托。
- [ ] 5.2 复核 query/write 依赖方向，避免子服务出现反向耦合或隐式共享状态。
- [ ] 5.3 复跑 KG 相关回归测试，确认外部行为契约与错误语义保持不变。

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 命令、关键输出与结论（含 Scenario ID 对应关系）。
- [ ] 6.2 在 RUN_LOG 记录 依赖同步检查（Dependency Sync Check） 的输入、核对项、结论与后续动作（`NO_DRIFT`）。
- [ ] 6.3 在 RUN_LOG 记录关键导出可见性与 Context Engine 消费链路回归证据。

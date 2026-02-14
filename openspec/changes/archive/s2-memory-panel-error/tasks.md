## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅补齐 MemoryPanel 异常处理与错误态闭环
- [x] 1.2 审阅并确认错误路径与边界路径：防止异常被吞没且 UI 无感知
- [x] 1.3 审阅并确认验收阈值：`invoke` 异常时必须进入可见错误态
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 标注为独立项

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID     | 测试文件                                                                         | 测试名称（拟定）                                   | 断言要点                     |
| --------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| `MEM-S2-MPE-S1` | `apps/desktop/renderer/src/features/memory/__tests__/MemoryPanel.error.test.tsx` | `sets error status when loadPanelData throws`      | 异常触发后状态切换为 `error` |
| `MEM-S2-MPE-S2` | `apps/desktop/renderer/src/features/memory/__tests__/MemoryPanel.error.test.tsx` | `renders visible error state after invoke failure` | UI 呈现与错误状态一致        |

## 3. Red（先写失败测试）

- [x] 3.1 编写 `MEM-S2-MPE-S1` 失败测试，先证明异常时未形成完整状态闭环
- [x] 3.2 编写 `MEM-S2-MPE-S2` 失败测试，先证明错误态在 UI 上不可见或不稳定
- [x] 3.3 运行对应测试并记录 Red 证据（失败输出与 Scenario ID 对应）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 `MEM-S2-MPE-S1/S2` 转绿的最小改动（catch + `setStatus("error")` + UI 显示）
- [x] 4.2 保持成功路径行为不变，不引入无关状态分支

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛错误状态更新路径，避免分散状态写入导致漂移
- [x] 5.2 提升测试可读性，确保错误态断言稳定且可定位

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

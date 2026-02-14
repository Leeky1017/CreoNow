## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s2-dual-field-migrate（A2-M-002 + A2-M-003）` 的问题定义与验收边界
- [x] 1.2 审阅 `openspec/specs/ipc/spec.md`，确认仅定义迁移兼容与弃用告警，不改通信模式
- [x] 1.3 审阅/补充 `openspec/changes/s2-dual-field-migrate/specs/ipc-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change 上游依赖为无，结论：`N/A / NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个 IPC 处理测试
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

Scenario 映射：

| Delta Scenario | 测试文件 | 用例 |
| --- | --- | --- |
| 仅新字段输入时正常处理且无弃用告警 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `S8 should accept executionId without deprecated warning` |
| 旧字段输入时兼容处理并记录告警 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `S9 should accept legacy runId and emit deprecated_field warning` |
| 新旧并存时优先采用新字段 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `S10 should prefer executionId when executionId and runId are both present` |
| 仅新字段输入时正常处理且无弃用告警 | `apps/desktop/tests/unit/skill-scope-management.test.ts` | `toggledWithId` 断言 `deprecatedWarnings.length === 0` |
| 旧字段输入时兼容处理并记录告警 | `apps/desktop/tests/unit/skill-scope-management.test.ts` | `toggledWithSkillId` 断言 `deprecated_field + field=skillId` |
| 新旧并存时优先采用新字段 | `apps/desktop/tests/unit/skill-scope-management.test.ts` | `toggledWithBoth` 返回 `id === builtin:rewrite` 且告警计数不增长 |

## 3. Red（先写失败测试）

- [x] 3.1 编写仅新字段输入的失败测试（无告警）
- [x] 3.2 编写旧字段输入的失败测试（必须产生 deprecated 告警）
- [x] 3.3 运行目标测试并记录 Red 证据

Red 证据（实现前）：

```bash
pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts
# FAIL: [S9 ...] Expected values to be strictly equal: 0 !== 1

pnpm exec tsx apps/desktop/tests/unit/skill-scope-management.test.ts
# FAIL: AssertionError [ERR_ASSERTION] 0 !== 1
```

## 4. Green（最小实现通过）

- [x] 4.1 接入旧字段弃用告警与新字段优先规则，使 Red 转绿
- [x] 4.2 保持现有通道接口和返回结构不变

## 5. Refactor（保持绿灯）

- [x] 5.1 统一告警事件名和字段格式
- [x] 5.2 复跑测试，确认兼容期行为稳定

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出，见 `openspec/_ops/task_runs/ISSUE-546.md`）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG（见 `openspec/_ops/task_runs/ISSUE-546.md`）

Green 证据（实现后）：

```bash
pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts
# PASS (exit 0)

pnpm exec tsx apps/desktop/tests/unit/skill-scope-management.test.ts
# PASS (exit 0)
```

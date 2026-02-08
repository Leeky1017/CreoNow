## 1. Specification

- [ ] 1.1 审阅并确认 KG-1 仅覆盖实体管理、关系管理、查询契约三项主 requirement
- [ ] 1.2 审阅并确认 SQLite schema、IPC 命名、Zod 契约与容量上限（50,000/200,000/200）
- [ ] 1.3 审阅并确认跨切异常覆盖（数据异常/并发冲突/容量溢出）与性能阈值

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] KG1-R1-S1 手动创建角色实体
  - 目标测试：`apps/desktop/tests/integration/kg/entity-create-role.test.ts`
  - 用例：`should create character entity via knowledge:entity:create and open detail panel`
- [ ] KG1-R1-S2 编辑实体属性
  - 目标测试：`apps/desktop/tests/integration/kg/entity-update-attributes.test.ts`
  - 用例：`should persist attributes and reject when key count exceeds 200`
- [ ] KG1-R1-S3 删除实体级联关系
  - 目标测试：`apps/desktop/tests/integration/kg/entity-delete-cascade.test.ts`
  - 用例：`should delete related edges in same transaction when deleting entity`
- [ ] KG1-R2-S1 拖拽创建预置关系
  - 目标测试：`apps/desktop/tests/integration/kg/relation-create-drag.test.ts`
  - 用例：`should create ally relation from drag action`
- [ ] KG1-R2-S2 自定义关系类型并复用
  - 目标测试：`apps/desktop/tests/integration/kg/relation-custom-type.test.ts`
  - 用例：`should persist custom relation type and reuse in next create`
- [ ] KG1-R2-S3 删除关系
  - 目标测试：`apps/desktop/tests/integration/kg/relation-delete.test.ts`
  - 用例：`should delete selected relation without deleting endpoint entities`
- [ ] KG1-R3-S1 子图查询契约
  - 目标测试：`apps/desktop/tests/integration/kg/query-subgraph-contract.test.ts`
  - 用例：`should return nodeCount edgeCount queryCostMs and enforce k<=3`
- [ ] KG1-R3-S2 循环检测与超时降级
  - 目标测试：`apps/desktop/tests/integration/kg/query-cycle-timeout.test.ts`
  - 用例：`should return cycles and downgrade path query with KG_QUERY_TIMEOUT`
- [ ] KG1-A-S1 KG-1 性能基线
  - 目标测试：`apps/desktop/tests/perf/kg/kg-foundation.benchmark.test.ts`
  - 用例：`should satisfy CRUD and subgraph latency baseline at target dataset`
- [ ] KG1-X-S1 重复实体阻断
  - 目标测试：`apps/desktop/tests/unit/kg/entity-duplicate-guard.test.ts`
  - 用例：`should return KG_ENTITY_DUPLICATE for same type and normalized name`
- [ ] KG1-X-S2 非法关系阻断
  - 目标测试：`apps/desktop/tests/unit/kg/relation-validation.test.ts`
  - 用例：`should return KG_RELATION_INVALID for dangling or cross-project entity refs`
- [ ] KG1-X-S3 并发更新冲突
  - 目标测试：`apps/desktop/tests/integration/kg/entity-update-conflict.test.ts`
  - 用例：`should return KG_ENTITY_CONFLICT with latestSnapshot on stale version`
- [ ] KG1-X-S4 节点/边容量上限
  - 目标测试：`apps/desktop/tests/integration/kg/capacity-limits.test.ts`
  - 用例：`should return KG_CAPACITY_EXCEEDED when node or edge limit reached`

## 3. Red（先写失败测试）

- [ ] 3.1 先为 KG1-R1-S1~KG1-R1-S3 编写失败测试并确认 Red（实体 CRUD）
- [ ] 3.2 再为 KG1-R2-S1~KG1-R2-S3 编写失败测试并确认 Red（关系管理）
- [ ] 3.3 再为 KG1-R3-S1~KG1-R3-S2 编写失败测试并确认 Red（查询契约）
- [ ] 3.4 最后为 KG1-A-S1 与 KG1-X-S1~KG1-X-S4 编写失败测试并记录证据

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让实体管理 Red 转绿的最小代码
- [ ] 4.2 仅实现让关系管理与查询契约 Red 转绿的最小代码
- [ ] 4.3 仅实现跨切异常和容量保护所需最小行为，不引入额外能力

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离实体/关系 schema 与错误码常量，消除重复逻辑
- [ ] 5.2 统一 IPC 响应 envelope 与日志字段，保持外部契约不变
- [ ] 5.3 复核 Storybook 三态（实体详情页）与数据层测试保持一致

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Scenario 映射、Red 失败输出、Green 通过输出
- [ ] 6.2 记录关键命令输出（单测/集测/基线测试）与阈值结果
- [ ] 6.3 记录 Rulebook validate、门禁检查与 PR 证据

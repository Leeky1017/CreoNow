## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅处理 Context 装配链路循环依赖，不改业务行为
- [x] 1.2 审阅并确认错误路径与边界路径：类型来源双写、跨 fetcher 依赖回流、循环检测漏检
- [x] 1.3 审阅并确认验收阈值与不可变契约：`context:assemble` 外部契约不变、Context 子目录无新增循环依赖
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 为独立项，结论 `N/A（无上游 active change）`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] `CE-S1-BCC-S1` → `apps/desktop/main/src/services/context/__tests__/layerAssemblyService.dependency-graph.test.ts`
- [x] `CE-S1-BCC-S2` → `apps/desktop/main/src/services/context/__tests__/formatEntity.import-boundary.test.ts`
- [x] `CE-S1-BCC-S3` → `apps/desktop/main/src/services/context/__tests__/layerAssemblyService.contract-regression.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 新增 `CE-S1-BCC-S1` 失败测试：验证 fetcher 不得再从 `layerAssemblyService.ts` 反向导入类型
- [x] 3.2 新增 `CE-S1-BCC-S2` 失败测试：验证 `formatEntityForContext` 必须来自 `utils/formatEntity.ts`
- [x] 3.3 新增 `CE-S1-BCC-S3` 失败测试：验证 Context 目录存在循环依赖或契约漂移时测试失败

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Red 转绿的最小代码（提取 `types.ts`、提取 `utils/formatEntity.ts`、修正 import）
- [x] 4.2 逐条使失败测试通过，不引入无关功能

## 5. Refactor（保持绿灯）

- [x] 5.1 去重与重构，保持测试全绿（删除临时 re-export 与残留中转依赖）
- [x] 5.2 不改变已通过的外部行为契约

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 依赖同步检查（Dependency Sync Check） 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

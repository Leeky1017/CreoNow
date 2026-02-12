## 1. Specification

- [x] 1.1 审阅主 spec `skill-system/spec.md` 中「模块级可验收标准」的量化阈值、边界与类型安全、失败处理策略
- [x] 1.2 审阅主 spec 中「异常与边界覆盖矩阵」的 5 类覆盖要求及 Scenario（2 个）
- [x] 1.3 审阅 NFR 中 Performance / Capacity / Security / Concurrency 全部指标及 Scenario（2 个）
- [x] 1.4 审阅错误码完整集合（SKILL_TIMEOUT / SKILL_DEPENDENCY_MISSING / SKILL_QUEUE_OVERFLOW / SKILL_CAPACITY_EXCEEDED / SKILL_SCOPE_VIOLATION / SKILL_INPUT_EMPTY / LLM_API_ERROR / VALIDATION_ERROR）
- [x] 1.5 依赖同步检查（Dependency Sync Check）：上游 `skill-system-p0` ~ `skill-system-p3`；核对所有错误码、IPC schema、队列/并发/超时配置

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「超时中断可验证」→ `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
- [x] 2.2 S「队列溢出被拒绝」→ `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
- [x] 2.3 S「同名技能覆盖竞态」→ `apps/desktop/tests/unit/skill-scope-management.test.ts`
- [x] 2.4 S「跨项目技能越权访问阻断」→ `apps/desktop/tests/unit/skill-scope-management.test.ts`
- [x] 2.5 S「全局并发上限保护」→ `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
- [x] 2.6 S「自定义技能容量超限」→ `apps/desktop/tests/unit/skill-scope-management.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写异常矩阵（竞态/容量/安全）Scenario 的失败测试
- [x] 3.2 编写 NFR 性能基准 Scenario 的失败测试
- [x] 3.3 编写权限/安全（跨项目越权）Scenario 的失败测试
- [x] 3.4 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 实现自定义技能容量检查（全局 1,000 / 每项目 500）
- [x] 4.2 实现跨项目技能越权检查 + SKILL_SCOPE_VIOLATION + 安全审计日志
- [x] 4.3 实现同名技能覆盖的一致性解析保障
- [x] 4.4 实现单输出超长处理
- [x] 4.5 补齐所有 `skill:*` 通道的 Zod request/response schema 声明

## 5. Refactor（保持绿灯）

- [x] 5.1 统一错误码常量与错误工厂函数
- [x] 5.2 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
- [x] 6.3 记录性能基准测试结果（execute 响应 / 入队响应 / 取消生效延迟）

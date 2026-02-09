## 1. Specification

- [ ] 1.1 审阅 `judge:evaluate` / `judge:result` 最小契约字段
- [ ] 1.2 审阅严重度与标签反馈结构（high/medium/low）
- [ ] 1.3 审阅高级判定失败时的规则兜底与提示语义
- [ ] 1.4 依赖同步检查（Dependency Sync Check）：依赖 `ai-service-p2-panel-chat-apply-flow`；结论 `NO_DRIFT`
- [ ] 1.5 Out-of-scope 确认：不扩展 provider failover 与配额策略

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S1「Judge 输出严重度标签可被面板消费」→ `apps/desktop/tests/integration/judge-result-labels.test.ts`
- [ ] 2.2 S2「Judge 全通过时返回通过态」→ `apps/desktop/main/src/services/ai/__tests__/judge-pass-state.test.ts`
- [ ] 2.3 S3「高级判定不可用时规则兜底并显式标记」→ `apps/desktop/main/src/services/ai/__tests__/judge-fallback-partial-check.test.ts`
- [ ] 2.4 建立 Scenario 与错误码/标记位断言映射

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S1 失败测试（缺少严重度或标签结构时失败）
- [ ] 3.2 编写 S2 失败测试（通过态结构不一致时失败）
- [ ] 3.3 编写 S3 失败测试（降级未标记 partialChecksSkipped 时失败）
- [ ] 3.4 将 Red 失败证据记录至 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 最小实现 `judge:evaluate` 输入校验与 handler
- [ ] 4.2 最小实现 `judge:result` 推送结构与严重度映射
- [ ] 4.3 最小实现高级失败 -> 规则兜底 -> 部分校验标记
- [ ] 4.4 仅让 Red 转绿，不扩展无关面板功能

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛 Judge 结果建模，避免面板与主进程双口径
- [ ] 5.2 抽离规则引擎适配层，保持降级路径可测
- [ ] 5.3 回归测试保持全绿

## 6. Evidence

- [ ] 6.1 RUN_LOG 记录 Judge Red/Green 证据与命令输出
- [ ] 6.2 记录 依赖同步检查（Dependency Sync Check）（数据结构/IPC/错误码/阈值）= `NO_DRIFT`
- [ ] 6.3 记录降级提示「部分校验已跳过」的可见性证据

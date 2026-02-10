## 1. Specification

- [x] 1.1 审阅 `judge:quality:evaluate` / `judge:quality:result` 契约字段与严重度分级语义
- [x] 1.2 完成 Dependency Sync Check（依赖 `ai-service-p2-panel-chat-apply-flow`）并确认 `NO_DRIFT`
- [x] 1.3 发现 IPC 命名治理冲突后回写 change 文档（两段式 -> 三段式）再推进实现

## 2. TDD Mapping（先测前提）

- [x] 2.1 S1「Judge 输出严重度标签可被面板消费」→ `apps/desktop/tests/integration/judge-result-labels.test.ts`
- [x] 2.2 S2「Judge 全通过时返回通过态」→ `apps/desktop/main/src/services/ai/__tests__/judge-pass-state.test.ts`
- [x] 2.3 S3「高级判定不可用时规则兜底并显式标记」→ `apps/desktop/main/src/services/ai/__tests__/judge-fallback-partial-check.test.ts`
- [x] 2.4 Red 失败证据记录完成前不进入 Green

## 3. Red（先写失败测试）

- [x] 3.1 新增 S1 失败测试，验证缺失 handler/标签结构时失败
- [x] 3.2 新增 S2 失败测试，验证通过态结构不一致时失败
- [x] 3.3 新增 S3 失败测试，验证降级未标记 `partialChecksSkipped` 时失败

## 4. Green（最小实现通过）

- [x] 4.1 实现 `judge:quality:evaluate` 输入校验与 handler
- [x] 4.2 实现 `judge:quality:result` 推送结构与严重度映射
- [x] 4.3 实现高级检查失败 -> 规则兜底 -> `partialChecksSkipped` 标记
- [x] 4.4 AI 面板非阻塞消费 Judge 结果并展示标签/摘要

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛 Judge 结果类型到 `packages/shared/types/judge.ts`，避免双口径
- [x] 5.2 在 preload 统一做 Judge 推送事件运行时校验
- [x] 5.3 将新增测试纳入 `test:unit` 与 `test:integration` 回归链

## 6. Evidence

- [x] 6.1 记录 Red/Green 命令与输出到 `openspec/_ops/task_runs/ISSUE-374.md`
- [x] 6.2 记录 Dependency Sync Check 核对点（数据结构/IPC/错误码/阈值）结论 `NO_DRIFT`
- [ ] 6.3 记录 preflight、required checks、main 收口与 Rulebook 归档证据

## 1. Specification

- [x] 1.1 审阅 `openspec/specs/ai-service/spec.md` 与 P4 delta（候选数范围、重生成、usage/cost）
- [x] 1.2 完成 Dependency Sync Check（依赖 `ai-service-p2-panel-chat-apply-flow`）并记录 `NO_DRIFT`
- [x] 1.3 确认 out-of-scope：provider 健康探测/自动降级不进入本次实现

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S1「候选卡片选择并应用到编辑器」→ `apps/desktop/renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx`
- [x] 2.2 S2「全部不满意触发重生成与负反馈落盘」→ `apps/desktop/tests/integration/ai-candidate-regenerate-feedback.test.ts`
- [x] 2.3 S3「会话 token 统计可见且口径一致」→ `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-render.test.tsx`
- [x] 2.4 S4「未配置模型价格时隐藏费用」→ `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-no-price.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 先写 S1 失败测试（候选切换后未走 Inline Diff 确认链路即失败）
- [x] 3.2 先写 S2 失败测试（未写 `feedback=strong_negative` 与同参重生成即失败）
- [x] 3.3 先写 S3/S4 失败测试（统计字段缺失或无价格未隐藏费用即失败）
- [x] 3.4 将 Red 命令与断言失败信息写入 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 扩展 `ai:skill:run` 契约：`candidateCount(1..5)`、`candidates`、`usage`
- [x] 4.2 实现候选配置持久化（default=1）、候选卡片展示与选择应用
- [x] 4.3 实现“全部不满意”同参重生成与强负反馈（`ai:skill:feedback` + `memory:trace:feedback`）
- [x] 4.4 实现 token 统计展示与可选费用字段（无价格时隐藏）
- [x] 4.5 `pnpm contract:generate` 同步 IPC 类型并让 Red 全转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 统一候选/usage metadata 类型，避免 renderer/main 漂移
- [x] 5.2 收敛重生成逻辑到 store action，避免组件内分叉
- [x] 5.3 回归现有 AI 面板/流式链路测试保持全绿

## 6. Evidence

- [x] 6.1 `openspec/_ops/task_runs/ISSUE-380.md` 记录 Red/Green 命令输出与关键断言
- [x] 6.2 记录 Dependency Sync Check（数据结构/IPC/错误码/阈值）结论 `NO_DRIFT`
- [x] 6.3 记录 preflight 与 required checks 证据，完成 main 收口与 Rulebook 归档

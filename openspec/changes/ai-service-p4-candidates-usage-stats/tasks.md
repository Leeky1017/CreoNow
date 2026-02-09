## 1. Specification

- [ ] 1.1 审阅候选数量配置范围与默认值（1-5, default=1）
- [ ] 1.2 审阅候选卡片展示、选择应用与重生成行为
- [ ] 1.3 审阅 token/费用统计展示口径与缺省策略
- [ ] 1.4 依赖同步检查（Dependency Sync Check）：依赖 `ai-service-p2-panel-chat-apply-flow`；结论 `NO_DRIFT`
- [ ] 1.5 Out-of-scope 确认：不实现 provider 健康探测与降级切换

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S1「候选卡片选择并应用到编辑器」→ `apps/desktop/renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx`
- [ ] 2.2 S2「全部不满意触发重生成与负反馈落盘」→ `apps/desktop/tests/integration/ai-candidate-regenerate-feedback.test.ts`
- [ ] 2.3 S3「会话 token 统计可见且口径一致」→ `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-render.test.tsx`
- [ ] 2.4 S4「未配置模型价格时隐藏费用」→ `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-no-price.test.tsx`

### Scenario → Test 映射

- [ ] S1「候选卡片选择并应用到编辑器」→ `apps/desktop/renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx`
- [ ] S2「全部不满意触发重生成与负反馈落盘」→ `apps/desktop/tests/integration/ai-candidate-regenerate-feedback.test.ts`
- [ ] S3「会话 token 统计可见且口径一致」→ `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-render.test.tsx`
- [ ] S4「未配置模型价格时隐藏费用」→ `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-no-price.test.tsx`

## 3. Red（先写失败测试）

- [ ] 3.1 先写 S1 失败测试（候选应用未进入 Inline Diff 即失败）
- [ ] 3.2 先写 S2 失败测试（重生成未写负反馈接口即失败）
- [ ] 3.3 先写 S3/S4 失败测试（统计字段缺失或费用隐藏不正确即失败）
- [ ] 3.4 将 Red 输出与断言差异写入 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 最小实现候选配置、卡片展示与选择应用
- [ ] 4.2 最小实现「全部不满意」重生成与记忆反馈接口调用
- [ ] 4.3 最小实现 token 统计与费用可选展示
- [ ] 4.4 仅覆盖本 change 范围并让 Red 全转绿

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一候选与统计 metadata 类型定义，避免跨层漂移
- [ ] 5.2 收敛记忆反馈接口适配层，避免 UI 直连业务细节
- [ ] 5.3 回归测试保持全绿

## 6. Evidence

- [ ] 6.1 RUN_LOG 记录 Red/Green 命令输出、关键快照与断言
- [ ] 6.2 记录 依赖同步检查（Dependency Sync Check）（数据结构/IPC/错误码/阈值）= `NO_DRIFT`
- [ ] 6.3 记录 Out-of-scope 未越界检查（未触及 failover 机制）

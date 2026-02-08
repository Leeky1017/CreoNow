## 1. Implementation

- [ ] 1.1 扩展 `ai:skill:run` 契约（mode/model）并生成共享类型
- [ ] 1.2 贯通 Renderer `AiPanel -> aiStore` 运行参数传递
- [ ] 1.3 贯通 Main `ipc/ai -> aiService` 参数并生效到上游请求
- [ ] 1.4 保持既有流式/取消/错误状态机行为不回归

## 2. Testing

- [ ] 2.1 Red：新增 store + service 单测先失败
- [ ] 2.2 Green：新增单测通过并校验契约生成无漂移
- [ ] 2.3 回归：`pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm test:unit`

## 3. Documentation

- [ ] 3.1 更新 `openspec/changes/ai-panel-model-mode-wiring/tasks.md` 状态
- [ ] 3.2 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃 change>=2）
- [ ] 3.3 记录并维护 `openspec/_ops/task_runs/ISSUE-264.md`（Red/Green 证据）


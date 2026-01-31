## 1. Implementation
- [ ] 1.1 Extend IPC contract：新增 `ai:skill:run/cancel/feedback`，并生成 shared types
- [ ] 1.2 Main：实现 `aiService`（Fake-first provider 选择、timeout/cancel、错误映射）
- [ ] 1.3 Main：实现 Fake AI server（success/delay/timeout/upstream-error，stream/non-stream）
- [ ] 1.4 Main：实现 `apps/desktop/main/src/ipc/ai.ts` handlers + `ai:skill:stream` emitter，并在 main entry 注册
- [ ] 1.5 Preload：将 `ai:skill:stream` 转发为 renderer 可订阅事件（不增加额外 `window.creonow` API）
- [ ] 1.6 Renderer：实现 `aiStore` 状态机 + `useAiStream` + `AiPanel`，并挂载到 RightPanel
- [ ] 1.7 Logging：补齐 `ai_run_started/completed/failed/canceled/timeout` 证据行

## 2. Testing
- [ ] 2.1 Unit（可选）：错误映射（TIMEOUT/CANCELED/UPSTREAM_ERROR/INVALID_ARGUMENT）
- [ ] 2.2 E2E（Windows）：`ai-runtime.spec.ts` 覆盖 success/delay/timeout/upstream-error/cancel
- [ ] 2.3 Verification：`pnpm contract:check && pnpm test:unit && pnpm typecheck && pnpm desktop:test:e2e`

## 3. Documentation
- [ ] 3.1 RUN_LOG：记录关键命令与关键输出（只追加不回写）

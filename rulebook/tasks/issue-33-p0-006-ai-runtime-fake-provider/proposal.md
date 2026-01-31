# Proposal: issue-33-p0-006-ai-runtime-fake-provider

## Why
P0-006 需要一个可测试、可观测的 AI Runtime（stream/cancel/timeout/upstream-error），并在 Windows CI/E2E 下默认不依赖真实网络与真实 API key。

## What Changes
- Add: IPC `ai:skill:run/cancel/feedback` + `ai:skill:stream`（typed contract/codegen + stable error codes）。
- Add: main process `aiService`（provider 选择、Fake-first、timeout/cancel、错误映射、结构化日志）。
- Add: Fake AI Server（success/delay/timeout/upstream-error，支持 streaming + 非 streaming）。
- Add: renderer AI panel/store/hook，并新增 Windows Playwright Electron E2E 覆盖 5 条路径。

## Impact
- Affected specs: `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-050`, `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-120`
- Affected code: `apps/desktop/main/src/ipc/*`, `apps/desktop/main/src/services/ai/*`, `apps/desktop/preload/src/*`, `apps/desktop/renderer/src/features/ai/*`, `apps/desktop/renderer/src/stores/*`, `apps/desktop/tests/e2e/*`
- Breaking change: NO
- User benefit: 提供可重复的 AI 运行时（含取消/超时/错误映射）与 Fake-first E2E 证据，便于后续 apply/context/memory/skills 闭环迭代。

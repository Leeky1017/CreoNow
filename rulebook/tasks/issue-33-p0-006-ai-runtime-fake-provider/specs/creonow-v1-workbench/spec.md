# Spec Delta: creonow-v1-workbench (ISSUE-33)

本任务实现 `P0-006`（AI Runtime + Fake AI server），完成 stream/cancel/timeout/upstream-error 的可测最小闭环，并满足 Windows CI/E2E 的 Fake-first 约束。

## Changes

- Add: IPC `ai:skill:run/cancel/feedback` + `ai:skill:stream`（稳定事件结构与错误码）。
- Add: 主进程 AI Runtime：provider 选择、Fake-first、timeout/cancel、错误映射与结构化日志。
- Add: Fake AI server（success/delay/timeout/upstream-error；stream/non-stream；确定性输出用于断言）。
- Add: renderer 最小 AI UI（AiPanel + store + stream hook）。
- Add: Windows Playwright Electron E2E 覆盖成功/延迟/超时/上游错误/取消，并断言 main.log 证据行。

## Acceptance

- 满足 `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md` 的 Acceptance Criteria，并通过相关测试门禁。

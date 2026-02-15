# Proposal: issue-559-s3-trace-persistence

## Why

Sprint 3 的 `s3-trace-persistence` 要求 AI 生成链路具备可追踪落盘能力。当前仅有内存态 `traceId` 与日志事件，缺少 `generation_traces` / `trace_feedback` 的稳定持久化，导致回放与反馈关联不可审计。

## What Changes

- 新增 SQLite migration：`generation_traces` 与 `trace_feedback`。
- 新增 `traceStore`，提供 trace 落盘、feedback 关联写入、runId→traceId 查询。
- 在 `aiService.runSkill` 成功路径写入 trace；写入失败输出结构化降级信号并记录错误日志。
- 在 `aiService.feedback` 路径接入 `traceStore.recordTraceFeedback`，确保 feedback 与 trace 稳定关联。
- 新增 S3-TRACE-S1/S2/S3 Red→Green 测试，覆盖落盘成功、反馈关联、失败降级可观测。

## Impact

- Affected specs:
  - `openspec/changes/s3-trace-persistence/specs/ai-service-delta.md`
- Affected code:
  - `apps/desktop/main/src/db/migrations/0020_s3_trace_persistence.sql`
  - `apps/desktop/main/src/db/init.ts`
  - `apps/desktop/main/src/services/ai/traceStore.ts`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/services/ai/__tests__/traceStore.test.ts`
  - `apps/desktop/main/src/services/ai/__tests__/traceStore.feedback.test.ts`
  - `apps/desktop/main/src/services/ai/__tests__/aiService.trace-persistence.test.ts`
- Breaking change: NO
- User benefit:
  - 每次 AI 生成可落盘追踪，反馈记录可绑定到具体 trace，持久化失败不会静默。

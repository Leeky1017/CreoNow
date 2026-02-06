# P1-012: ModePicker 仅装饰无语义分发

Status: todo
verification_status: verified
audit_issue: #19
requirement: CNAUD-REQ-019
source: Opus审计完整版.md §2.4
priority: P1
design: ../../design/01-ai-pipeline.md

## Goal

将审计问题 #19 执行化为可验收改造，满足 CNAUD-REQ-019，并保证失败路径可观测。

## Requirement

ModePicker 必须驱动真实 mode 语义，或显式下线避免误导。

## Assets in Scope

- apps/desktop/renderer/src/features/ai/ModePicker.tsx
- apps/desktop/renderer/src/features/ai/AiPanel.tsx
- apps/desktop/renderer/src/stores/aiStore.ts

## Implementation Notes

- 先复核当前代码证据与该卡 verification_status 是否仍成立。
- 变更必须沿单链路收敛，避免引入并行实现或 silent fallback。
- 若涉及 IPC/DB/schema，必须同步更新契约、调用方和测试。

## Acceptance Checklist

- [ ] 根因修复与 CNAUD-REQ-019 保持一致。
- [ ] 关键失败路径返回可判定结果（ok true/false + 稳定错误码）。
- [ ] 相关测试（unit/integration/vitest/e2e）覆盖新增或变更行为。
- [ ] RUN_LOG 记录关键命令、关键输出与证据路径。

## Verification

- [ ] pnpm typecheck
- [ ] pnpm lint
- [ ] pnpm contract:check（涉及 IPC contract 时必跑）
- [ ] pnpm test:unit
- [ ] pnpm test:integration（涉及 main/data 链路时必跑）
- [ ] pnpm -C apps/desktop test:run（涉及 renderer/store 时必跑）

## Notes

- GitHub 执行阶段需保持 1 卡对应 1 Issue（Issue 号作为任务唯一 ID）。
- Commit message 必须包含 (#N)，PR body 必须包含 Closes #N。

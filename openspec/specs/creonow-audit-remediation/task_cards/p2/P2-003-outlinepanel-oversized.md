# P2-003: OutlinePanel 文件过大

Status: todo
verification_status: verified
audit_issue: #27
requirement: CNAUD-REQ-027
source: Opus审计完整版.md §9.3
priority: P2
design: ../../design/06-architecture-consistency.md

## Goal

将审计问题 #27 执行化为可验收改造，满足 CNAUD-REQ-027，并保证失败路径可观测。

## Requirement

OutlinePanel 必须按图标、列表项、搜索与容器职责拆分。

## Assets in Scope

- apps/desktop/renderer/src/features/outline/OutlinePanel.tsx

## Implementation Notes

- 先复核当前代码证据与该卡 verification_status 是否仍成立。
- 变更必须沿单链路收敛，避免引入并行实现或 silent fallback。
- 若涉及 IPC/DB/schema，必须同步更新契约、调用方和测试。

## Acceptance Checklist

- [ ] 根因修复与 CNAUD-REQ-027 保持一致。
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

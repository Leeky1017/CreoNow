# P1-013: CI 未运行 desktop vitest 门禁

Status: todo
verification_status: stale
audit_issue: #20
requirement: CNAUD-REQ-020
source: Opus审计完整版.md §6.3
priority: P1
design: ../../design/05-testing-ci.md

## Goal

将审计问题 #20 执行化为可验收改造，满足 CNAUD-REQ-020，并保证失败路径可观测。

## Requirement

CI 必须包含 renderer/store vitest 门禁并阻止失败合并。

## Assets in Scope

- .github/workflows/ci.yml
- apps/desktop/package.json

## Implementation Notes

- 先复核当前代码证据与该卡 verification_status 是否仍成立。
- 变更必须沿单链路收敛，避免引入并行实现或 silent fallback。
- 若涉及 IPC/DB/schema，必须同步更新契约、调用方和测试。

## Acceptance Checklist

- [ ] 根因修复与 CNAUD-REQ-020 保持一致。
- [ ] 关键失败路径返回可判定结果（ok true/false + 稳定错误码）。
- [ ] 相关测试（unit/integration/vitest/e2e）覆盖新增或变更行为。
- [ ] RUN_LOG 记录关键命令、关键输出与证据路径。
- [ ] 以关闭证据卡完成：补充已修复证据与回归防线。

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

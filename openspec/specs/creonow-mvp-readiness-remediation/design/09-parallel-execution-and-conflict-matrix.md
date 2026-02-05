# Design 09 — Parallel Execution & Conflict Matrix（并行/冲突矩阵）

> Spec: `../spec.md`

## 1) 高冲突文件（必须串行或明确 owner）

这些文件/域会被多张任务卡触碰，必须 **串行** 或 **先打基础再并行**：

- `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- `packages/shared/types/ipc-generated.ts`（codegen 输出）
- `apps/desktop/main/src/ipc/**`（project/version 等 handlers）
- `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`
- `apps/desktop/renderer/src/components/layout/AppShell.tsx`

硬约束（MUST）：

- **IPC contract + codegen**：同一时间只能 1 个 PR 修改（否则必冲突）。

## 2) 冲突矩阵（任务卡 × touchpoints）

| Card                     | ipc-contract + codegen | main project service       | renderer Dashboard | renderer VersionHistory | renderer AppShell | CI workflow |
| ------------------------ | ---------------------- | -------------------------- | ------------------ | ----------------------- | ----------------- | ----------- |
| P0-001 Dashboard actions | X                      | X                          | X                  |                         |                   |             |
| P0-002 Version preview   |                        |                            |                    | X                       |                   |             |
| P0-003 Restore confirm   |                        |                            |                    | X                       | X                 |             |
| P0-004 ErrorBoundary     |                        |                            |                    |                         | X (mount point)   |             |
| P0-005 CI vitest         |                        |                            |                    |                         |                   | X           |
| P1-004 keytar            |                        | X (aiProxySettingsService) |                    |                         |                   |             |
| P1-007 AI retry          |                        | X (aiService)              |                    |                         |                   |             |
| P2-004 logger            | (可能)X                | (可能)X                    | (可能)X            | (可能)X                 | (可能)X           |             |

## 3) 推荐并行策略（最小阻塞）

- 先做 P0-005（CI vitest）→ 让后续 renderer tests 有门禁
- P0-002 / P0-003 / P0-004 可以并行（不触碰 ipc-contract）
- P0-001 必须单独排队（触碰 ipc-contract + codegen + main/service）

## 4) PR 粒度建议（写死）

- 任何改 `ipc-contract.ts` 的 PR：
  - MUST 只做一个 domain（本 spec：project domain）
  - MUST 同步更新 `ipc-generated.ts`（`pnpm contract:generate`）
  - MUST 带一个最小 E2E 或 integration 覆盖该 domain

# P0-013: Constraints / Judge（最小可用 + Windows 可测降级）

Status: pending

## Goal

提供最小可用的写作约束与质量门禁能力：constraints 配置可读写；judge 模型状态可见且可操作（ensure）；在 Windows CI 上必须可测（允许通过 fake/降级实现，但不得 silent failure）。

## Dependencies

- Spec: `../spec.md#cnwb-req-110`
- Spec: `../spec.md#cnwb-req-040`（错误语义）
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`
- P0-001: `./P0-001-windows-ci-windows-e2e-build-artifacts.md`

## Expected File Changes

| 操作   | 文件路径                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（constraints/judge 相关表）                     |
| Add    | `apps/desktop/main/src/ipc/constraints.ts`（`constraints:get/set`）                                 |
| Add    | `apps/desktop/main/src/ipc/judge.ts`（`judge:model:getState/ensure` + `judge:l2:prompt`）           |
| Add    | `apps/desktop/main/src/services/judge/judgeService.ts`（状态机：not_ready/downloading/ready/error） |
| Add    | `apps/desktop/renderer/src/features/settings/JudgeSection.tsx`（Settings UI 最小入口）              |
| Add    | `apps/desktop/tests/e2e/judge.spec.ts`                                                              |

## Acceptance Criteria

- [ ] Constraints：
  - [ ] `constraints:get` 返回当前配置（含默认值）
  - [ ] `constraints:set` 可更新并持久化
  - [ ] 参数校验失败 → `INVALID_ARGUMENT`
- [ ] Judge：
  - [ ] `judge:model:getState` 返回稳定状态枚举（至少：`not_ready/downloading/ready/error`）
  - [ ] `judge:model:ensure` 可触发状态变化：
    - [ ] 真实下载/加载（若实现）或
    - [ ] 可测降级：在 E2E 模式下直接进入固定状态（但必须可观测且写入 spec/实现）
  - [ ] 任意失败必须返回稳定错误码（`MODEL_NOT_READY/IO_ERROR/TIMEOUT/CANCELED/INTERNAL`）
- [ ] UI：
  - [ ] Settings 页面可查看 judge 状态并触发 ensure

## Tests

- [ ] E2E（Windows）`judge.spec.ts`
  - [ ] 打开 Settings → 断言 judge 状态可见
  - [ ] 点击 ensure → 断言状态变化或出现可读错误（可测）

## Edge cases & Failure modes

- ensure 超时 → `TIMEOUT` 且状态回到可恢复态（不得卡死）
- 用户取消 ensure → `CANCELED`
- Windows 下载目录不可写 → `IO_ERROR`（可诊断）

## Observability

- `main.log` 记录：
  - `constraints_updated`
  - `judge_state`（state + errorCode?）
  - `judge_ensure_started/succeeded/failed`（含 error.code）

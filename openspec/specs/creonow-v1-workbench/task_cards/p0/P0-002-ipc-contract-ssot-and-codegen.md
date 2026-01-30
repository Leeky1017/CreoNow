# P0-002: IPC Contract SSOT + types codegen（阻断漂移）

Status: pending

## Goal

建立 CN 的 IPC 契约“单一事实源（SSOT）→ 自动生成 shared types → CI 校验”的闭环，确保 renderer/main/preload 的 IPC 调用永远类型一致且错误语义一致（Envelope + error codes），杜绝手工对接漂移。

## Dependencies

- Spec: `../spec.md#cnwb-req-040`
- Design: `../design/03-ipc-contract-and-errors.md`
- P0-001: `./P0-001-windows-ci-windows-e2e-build-artifacts.md`

## Expected File Changes

| 操作   | 文件路径                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（SSOT：channels + request/response types + error codes） |
| Add    | `scripts/contract-generate.ts`（读取 SSOT，生成 `ipc-generated.ts`）                                          |
| Add    | `packages/shared/types/ipc-generated.ts`（生成产物，提交入库；头部标注 DO NOT EDIT）                          |
| Add    | `apps/desktop/preload/src/ipc.ts`（typed invoke + runtime validation）                                        |
| Add    | `apps/desktop/renderer/src/lib/ipcClient.ts`（typed client：`invoke`）                                        |
| Update | `package.json`（scripts：`contract:generate`、`contract:check`）                                              |
| Update | `.github/workflows/ci.yml`（增加 `pnpm contract:check`）                                                      |
| Add    | `apps/desktop/tests/unit/contract-generate.spec.ts`（deterministic 生成测试）                                 |
| Update | `pnpm-lock.yaml`                                                                                              |

## Acceptance Criteria

- [ ] IPC 类型与通道列表由 SSOT 自动生成：
  - [ ] `packages/shared/types/ipc-generated.ts` 头部包含 `GENERATED FILE - DO NOT EDIT`
  - [ ] 禁止手改生成文件（CI `contract:check` 阻断）
- [ ] 所有 invoke 通道返回 Envelope（`ok:true|false`）
- [ ] 错误码字典至少覆盖（并在生成文件中导出）：
  - [ ] `INVALID_ARGUMENT/DB_ERROR/MODEL_NOT_READY/TIMEOUT/CANCELED/UPSTREAM_ERROR/INTERNAL`
- [ ] Preload 仅暴露一个入口：
  - [ ] `window.creonow.invoke(channel, payload)`
  - [ ] renderer 不得直接用 `ipcRenderer.invoke`
- [ ] CI 增加 `pnpm contract:check`：生成后 `git diff --exit-code` 必须为 0

## Tests

- [ ] Unit：
  - [ ] `contract:generate` 输出 deterministic（重复运行结果一致）
  - [ ] 未知 channel 被拒绝（返回 `INVALID_ARGUMENT` 或 TS 层不可编译，二选一但必须写死）
- [ ] E2E（Windows）：
  - [ ] `window.creonow.invoke('app:ping', {})` 返回 `{ ok: true }`

## Edge cases & Failure modes

- 生成脚本在不同 OS 上换行符不一致 → 必须统一为 `\n`（deterministic）
- `details` 包含不可序列化值（Error/BigInt）→ 必须在 IPC 边界剔除或 stringify

## Observability

- `contract:check` 必须在 CI 输出可读错误（diff）以便快速定位漂移
- 主进程日志必须记录未知 channel 调用（不含敏感 payload）

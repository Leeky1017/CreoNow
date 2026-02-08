# ISSUE-265

- Issue: #265
- Scope: IPC 六个 archived changes 集成核查与 delta report
- Follow-up remediation: #267 (`https://github.com/Leeky1017/CreoNow/issues/267`)

## Closeout Addendum (2026-02-08)

- 原审计结论：`30 已实现 / 2 部分实现 / 0 未实现`
- 两项“部分实现”已由 #267 关闭，更新为：`32 已实现 / 0 部分实现 / 0 未实现`

### Closed Items

1. Envelope 文档字段一致性
- 状态：已关闭
- 说明：主 spec 与指定 archived specs 的 `success` 示例已统一为 `ok`，并新增文档一致性单测。
- 证据：
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/archive/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md`
  - `openspec/changes/archive/ipc-p0-preload-gateway-and-security-baseline/specs/ipc/spec.md`
  - `apps/desktop/tests/unit/ipc-spec-envelope-wording.spec.ts`

2. Preload S2 安全自动化证据
- 状态：已关闭
- 说明：补齐 unit + E2E 双证据，验证 renderer 无法访问 `ipcRenderer/require`，且 `window.creonow.invoke` 正常。
- 证据：
  - `apps/desktop/tests/unit/ipc-preload-exposure-security.spec.ts`
  - `apps/desktop/tests/e2e/app-launch.spec.ts`
  - `openspec/_ops/task_runs/ISSUE-267.md`

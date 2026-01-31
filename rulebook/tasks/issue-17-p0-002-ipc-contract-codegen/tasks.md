## 1. Implementation

- [ ] 1.1 新增 IPC contract SSOT（channels + schema + error codes）
- [ ] 1.2 新增 `scripts/contract-generate.ts`，生成 `packages/shared/types/ipc-generated.ts`（deterministic + DO NOT EDIT）
- [ ] 1.3 Preload typed invoke gate：仅暴露 `window.creonow.invoke`，unknown channel 返回 `INVALID_ARGUMENT`
- [ ] 1.4 Renderer typed IPC client：通过 `ipcClient.invoke` 调用（不得直接用 `ipcRenderer.invoke`）
- [ ] 1.5 CI gate：新增 `pnpm contract:check` 并在 workflow 执行

## 2. Testing

- [ ] 2.1 Unit：生成 deterministic（重复运行内容一致）
- [ ] 2.2 E2E（Windows）：`window.creonow.invoke('app:ping', {})` 返回 `{ ok: true }`

## 3. Documentation

- [ ] 3.1 新增 `openspec/_ops/task_runs/ISSUE-17.md` 并持续追加 Runs（只追加不回写）

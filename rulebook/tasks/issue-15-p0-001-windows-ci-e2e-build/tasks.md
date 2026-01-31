## 1. Implementation

- [ ] 1.1 建立 `apps/desktop` electron-vite 工程骨架（main/preload/renderer）
- [ ] 1.2 最小 UI：渲染 `data-testid="app-shell"` 并提供 E2E ready hook（`window.__CN_E2E__.ready`）
- [ ] 1.3 最小 IPC：`app:ping`（Envelope，禁止 throw 穿透）
- [ ] 1.4 Playwright Electron E2E：`app-launch.spec.ts`（每用例独立 `CREONOW_USER_DATA_DIR`）
- [ ] 1.5 electron-builder Windows 打包：NSIS + zip；asarUnpack 覆盖 native 依赖
- [ ] 1.6 更新 CI：新增 `windows-latest` jobs（E2E + build artifacts），失败时上传报告/trace/logs

## 2. Testing

- [ ] 2.1 `pnpm -C apps/desktop test:e2e`
- [ ] 2.2 `pnpm -C apps/desktop build:win`（本地可跳过 Windows-only 环节，但 CI 必须通过）
- [ ] 2.3 CI（Windows）：验证 E2E 通过、build artifacts 上传、失败时证据上传

## 3. Documentation

- [ ] 3.1 新增 `openspec/_ops/task_runs/ISSUE-15.md` 并持续追加 Runs（只追加不回写）
- [ ] 3.2 Rulebook task：补齐 spec delta（`rulebook/tasks/**/specs/*/spec.md`）并保持 `rulebook task validate` 通过

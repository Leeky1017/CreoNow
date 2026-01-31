# P0-001: Windows CI + Windows E2E + build artifacts（门禁先行）

Status: done

## Goal

在 **Windows-first** 前提下，先把“能跑、能测、能打包”的工程地基搭起来：Windows runner 必须能跑 Playwright Electron E2E，并能产出 Windows 安装包/zip artifacts；失败时必须上传 trace/report 作为证据。

## Dependencies

- Spec: `../spec.md#cnwb-req-001`
- Spec: `../spec.md#cnwb-req-120`
- Design: `../design/10-windows-build-and-e2e.md`
- Design: `../design/03-ipc-contract-and-errors.md`（Envelope 约束用于最小 ping 通道）

## Expected File Changes

| 操作   | 文件路径                                                                                 |
| ------ | ---------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/package.json`（desktop workspace scripts：dev/build/e2e/build:win）        |
| Add    | `apps/desktop/electron.vite.config.ts`（electron-vite 配置）                             |
| Add    | `apps/desktop/main/src/index.ts`（主进程入口）                                           |
| Add    | `apps/desktop/preload/src/index.ts`（preload：contextBridge + 最小 invoke）              |
| Add    | `apps/desktop/renderer/index.html`                                                       |
| Add    | `apps/desktop/renderer/src/main.tsx`                                                     |
| Add    | `apps/desktop/renderer/src/App.tsx`（最小 UI：显示 CreoNow + `data-testid="app-shell"`） |
| Add    | `apps/desktop/tests/e2e/playwright.config.ts`                                            |
| Add    | `apps/desktop/tests/e2e/app-launch.spec.ts`                                              |
| Add    | `apps/desktop/electron-builder.json`（NSIS + zip；asarUnpack）                           |
| Update | `.github/workflows/ci.yml`（增加 windows job：e2e + build artifacts）                    |
| Update | `package.json`（根 scripts：透传 desktop scripts）                                       |
| Update | `pnpm-lock.yaml`（新增 electron/electron-vite/playwright 等依赖）                        |

## Acceptance Criteria

- [x] Windows CI 新增 job（`windows-latest`）并作为 required check（见 `CNWB-REQ-001`）
- [x] Windows job 运行 Playwright Electron E2E：
  - [x] 使用 `CREONOW_E2E=1`
  - [x] 每个用例使用独立 `CREONOW_USER_DATA_DIR`
  - [x] `app-launch.spec.ts` 至少断言 `data-testid="app-shell"` 可见
- [x] Windows job 运行 `build:win` 并上传产物：
  - [x] NSIS 安装包（或等价 Windows installer）
  - [x] zip（可选但推荐）
- [x] E2E 失败时必须上传：
  - [x] `playwright-report/`
  - [x] `test-results/`（含 trace/screenshot）
- [x] 最小 IPC ping 通道返回 Envelope（`ok:true|false`），不得 throw 穿透
- [x] 禁止真实网络依赖：CI 运行不需要任何真实 AI key

## Tests

- [ ] 本地（开发机）：
  - `pnpm -C apps/desktop install`（或由根 `pnpm install` 覆盖）
  - `pnpm -C apps/desktop test:e2e`（需在本卡定义脚本）
  - `pnpm -C apps/desktop build:win`
- [x] CI（Windows）：
  - 断言点：`app-shell` 可见
  - 断言点：失败时 artifacts 上传成功（可在 workflow 中强制 `if: failure()` 上传）

## Edge cases & Failure modes

- `CREONOW_USER_DATA_DIR` 含空格/中文路径（Windows 常见）→ app 必须可启动
- electron-builder `asar` 导致 `.node` 加载失败 → 必须通过 `asarUnpack` 覆盖并在 logs 可诊断
- Playwright 启动 flake：需要 `window.__CN_E2E__.ready` 钩子（见 `design/10`）

## Observability

- 日志文件（主进程）：`<userData>/logs/main.log`
  - 关键行必须包含：`app_ready`、`e2e_mode_enabled`（或等价）
- E2E 证据：
  - Playwright trace（失败必上传）
  - `main.log` 作为 artifact（建议上传，或在失败时上传）

## Completion

- Issue: #15
- PR: #16
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-15.md`

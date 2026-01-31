# Proposal: issue-15-p0-001-windows-ci-e2e-build

## Why

建立 CN V1 Workbench 的 Windows-first 工程地基：确保在 `windows-latest` 上能稳定启动 Electron、跑 Playwright Electron E2E、并产出可安装的 build artifacts；同时把失败证据（trace/report/logs）变成强制门禁，避免后续 P0 功能在不可回归/不可诊断的状态下推进。

## What Changes

- 新增 `apps/desktop/` 的 electron-vite 基础工程（main/preload/renderer）与最小 UI（`data-testid="app-shell"`）。
- 新增 Playwright Electron E2E 骨架（`app-launch`），并实现 E2E 隔离（每条用例独立 `CREONOW_USER_DATA_DIR`）。
- 更新 CI workflow：增加 `windows-latest` job（E2E + build:win），并在失败时上传 Playwright 报告/trace 等证据。
- 新增 electron-builder 配置，产出 Windows installer（NSIS）与 zip artifacts。
- 提供最小 IPC `app:ping` 通道（Envelope，禁止异常穿透），作为后续 IPC contract SSOT 的落点入口。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-001-windows-ci-windows-e2e-build-artifacts.md`（实现落地）
  - `openspec/specs/creonow-v1-workbench/design/10-windows-build-and-e2e.md`（实现对齐）
- Affected code:
  - `apps/desktop/**`
  - `.github/workflows/ci.yml`
  - `scripts/agent_pr_preflight.py`（补齐 preflight 脚本，修复交付链路缺口）
- Breaking change: NO（新增工程与门禁，不影响现有功能）
- User benefit: 后续 P0 能在 Windows 上持续回归；失败路径有 trace/log/DB 证据可定位，减少返工与 flake

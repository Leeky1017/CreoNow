# Spec Delta: creonow-v1-workbench (ISSUE-15)

本任务实现 `P0-001`（Windows CI + Windows E2E + build artifacts）的工程落地，用于把 `CNWB-REQ-001/120` 的门禁从“文档要求”转成“可执行检查”。

## Changes

- Add: Windows CI jobs（`windows-latest`）运行 Playwright Electron E2E，并在失败时上传 trace/report/logs 证据。
- Add: `apps/desktop` electron-vite 工程骨架（main/preload/renderer）与最小 UI（`data-testid="app-shell"`）。
- Add: electron-builder Windows 打包配置（NSIS + zip）。
- Add: 最小 IPC `app:ping`（Envelope），作为后续 `CNWB-REQ-040` contract/codegen 的落点入口。
- Fix: 补齐缺失的 `scripts/agent_pr_preflight.py`，避免交付脚本断链。

## Acceptance

- Windows runner 必须能跑：install → typecheck → lint → E2E → build:win（产物上传）。
- E2E 必须隔离 `CREONOW_USER_DATA_DIR`，且断言 `app-shell` 可见。
- `openspec/_ops/task_runs/ISSUE-15.md` 存在并通过 `openspec-log-guard`。

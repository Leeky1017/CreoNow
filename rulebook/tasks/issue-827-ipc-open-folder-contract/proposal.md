# Proposal: issue-827-ipc-open-folder-contract

更新时间：2026-03-01 21:25

## Why

当前产品缺少「打开文件夹」IPC 通道，用户无法像 Cursor/Windsurf 一样 Open Folder。本任务在 IPC 层打通 `dialog:folder:open` 通道。

## What

- `ipc-contract.ts` 新增 `dialog:folder:open` 通道
- 主进程 handler：调用 `dialog.showOpenDialog({ properties: ["openDirectory"] })`
- 返回 `{ selectedPath?: string }`（取消时 `selectedPath` 为 `undefined`）
- contract-generate 新增 `dialog` domain

## Scope

- `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- `apps/desktop/main/src/ipc/dialog.ts`（新增）
- `apps/desktop/main/src/index.ts`
- `scripts/contract-generate.ts`
- `packages/shared/types/ipc-generated.ts`（自动生成）

## Out of Scope

- 不做 UI 入口（见 `fe-ui-open-folder-entrypoints`）

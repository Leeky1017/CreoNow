# IPC Specification

## Purpose

定义 Electron 渲染进程与主进程之间的通信契约，包括通道命名、消息类型、参数校验和错误格式。包含自动化契约生成与校验。

### Scope

| Layer    | Path                                         |
| -------- | -------------------------------------------- |
| Contract | `main/src/ipc/contract/`                     |
| Preload  | `preload/src/`                               |
| Shared   | `packages/shared/`                           |
| Script   | `scripts/contract-generate.ts`               |

## Requirements

<!-- TODO: 由 Owner 定义具体 Requirements 和 Scenarios -->

# Document Management Specification

## Purpose

文档 CRUD、文件树管理、导出（Markdown / PDF / DOCX）。管理用户创作内容的存储、组织和输出。

### Scope

| Layer    | Path                                         |
| -------- | -------------------------------------------- |
| Backend  | `main/src/services/documents/`, `main/src/services/export/` |
| IPC      | `main/src/ipc/file.ts`, `main/src/ipc/export.ts` |
| Frontend | `renderer/src/features/files/`, `renderer/src/features/export/` |
| Store    | `renderer/src/stores/fileStore.ts`           |

## Requirements

<!-- TODO: 由 Owner 定义具体 Requirements 和 Scenarios -->

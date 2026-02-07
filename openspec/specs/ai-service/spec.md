# AI Service Specification

## Purpose

LLM 代理调用与流式响应，AI 面板交互，输出质量判定（Judge）。覆盖从用户点击「AI 生成」到结果呈现的完整链路。

### Scope

| Layer    | Path                                         |
| -------- | -------------------------------------------- |
| Backend  | `main/src/services/ai/`                      |
| IPC      | `main/src/ipc/ai.ts`, `main/src/ipc/aiProxy.ts`, `main/src/ipc/judge.ts` |
| Frontend | `renderer/src/features/ai/`                  |
| Store    | `renderer/src/stores/aiStore.ts`             |

## Requirements

<!-- TODO: 由 Owner 定义具体 Requirements 和 Scenarios -->

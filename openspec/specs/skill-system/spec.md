# Skill System Specification

## Purpose

将 AI 能力抽象为可组合的“技能”（续写、改写、扩写、缩写、风格迁移等），每个技能有独立的 context_rules 和执行逻辑，支持 builtin → global → project 三级作用域。

### Scope

| Layer    | Path                                         |
| -------- | -------------------------------------------- |
| Backend  | `main/src/services/skills/`                  |
| Skills   | `main/skills/packages/`                      |
| IPC      | `main/src/ipc/skills.ts`                     |

## Requirements

<!-- TODO: 由 Owner 定义具体 Requirements 和 Scenarios -->

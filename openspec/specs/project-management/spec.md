# Project Management Specification

## Purpose

创作项目生命周期管理：创建、打开、设置、模板、仪表盘、新手引导。管理用户从启动到日常使用的项目级操作。

### Scope

| Layer    | Path                                         |
| -------- | -------------------------------------------- |
| Backend  | `main/src/services/projects/`, `main/src/services/stats/` |
| IPC      | `main/src/ipc/project.ts`, `main/src/ipc/stats.ts` |
| Frontend | `renderer/src/features/projects/`, `renderer/src/features/dashboard/`, `renderer/src/features/onboarding/`, `renderer/src/features/welcome/`, `renderer/src/features/analytics/` |
| Store    | `renderer/src/stores/projectStore.tsx`, `renderer/src/stores/templateStore.ts`, `renderer/src/stores/onboardingStore.tsx` |

## Requirements

<!-- TODO: 由 Owner 定义具体 Requirements 和 Scenarios -->

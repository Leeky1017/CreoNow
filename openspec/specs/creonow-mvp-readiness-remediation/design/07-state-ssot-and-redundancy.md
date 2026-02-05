# Design 07 — State SSOT（消除 projectId/documentId 冗余）

> Spec: `../spec.md#cnmvp-req-008`
>
> Related card: `../task_cards/p1/P1-006-state-ssot-remove-project-document-id-redundancy.md`

审评报告指出 renderer 内部存在多处 `projectId/documentId` 冗余存储，风险是“切换项目/文档时不同 store 不一致”。

本文件写死改造方向，避免执行者“各自修一部分”导致冗余更复杂。

## 1) 问题快照（来自审评报告）

projectId 冗余（示例）：

- `projectStore.current.projectId`（事实源候选）
- `fileStore.projectId`
- `editorStore.projectId`
- `memoryStore.projectId`
- `kgStore.projectId`

documentId 冗余（示例）：

- `fileStore.currentDocumentId`
- `editorStore.documentId`

## 2) 改造原则（必须）

- 单一事实源：`currentProjectId` 以 `projectStore.current` 为 SSOT
- `currentDocumentId` 以 `editorStore.documentId` 为 SSOT（文件树只负责“列表 + 触发 openDocument”，不拥有事实）
- 拒绝隐式注入：跨 store 依赖必须通过 deps 显式传入（不得在 store 内 import/use 另一个 store）

## 3) 推荐落地方式（写死）

新增 `AppContext` 抽象（显式依赖注入）：

- 新文件：`apps/desktop/renderer/src/lib/appContext.ts`
- 形态：`type AppContext = { get: () => { projectId: string | null; documentId: string | null } }`
- 由 `AppShell` 创建并把 `context.get` 注入到需要的 store 工厂（或 bootstrap actions）

目标：让 store 在需要 projectId/documentId 时通过 `deps.getContext()` 获得，而不是各自维护副本。

> 注：这是 P1 级别的架构改造，必须配套 store tests 与边界测试（快速切换项目/文档）。

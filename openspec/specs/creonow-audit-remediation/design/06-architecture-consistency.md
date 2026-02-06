# Design 06 — Architecture Consistency Refactoring

## Scope

- CNAUD-REQ-010
- CNAUD-REQ-011
- CNAUD-REQ-015
- CNAUD-REQ-016
- CNAUD-REQ-022
- CNAUD-REQ-025
- CNAUD-REQ-026
- CNAUD-REQ-027
- CNAUD-REQ-030
- CNAUD-REQ-033
- CNAUD-REQ-034

## Current-State Evidence

- IpcInvoke、ServiceResult、ipcError 在多处重复实现。
- @shared 别名未建立，存在深层相对路径耦合。
- templateStore 直接 localStorage，不走统一契约链路。
- editorStore 与 fileStore bootstrap 逻辑重复。
- packages/shared 承载能力不足。
- AppShell、OutlinePanel 超大文件导致改动冲突高发。
- 根组件 Provider 嵌套过深。
- registerIpcHandlers 扁平注册。
- 生产代码存在散落 console 调用。

## Target Design

1. Shared Core Types
   - 抽取 IpcInvoke、ServiceResult、ipcError 到 shared 并统一导入。

2. Import and Path Policy
   - 引入 @shared alias 与 resolver。
   - 禁止新增跨包深层相对路径。

3. Store and Bootstrap Coordination
   - 引入 bootstrap coordinator，避免多 store 重复 orchestration。
   - template 数据链路迁移到 typed IPC + 持久层。

4. Structural Decomposition
   - AppShell/Outline 拆分为容器 + 纯视图 + hooks。
   - IPC 注册改为分组注册器。

5. Provider Composition
   - 引入 provider composer，降低根树嵌套深度。

6. Logging Policy
   - 生产日志统一走 logger（renderer/main 统一策略）。

## Verification Gates

- typecheck/lint: 重构后类型与导入约束稳定。
- unit: coordinator/registrar/adapter 可单测。
- architecture audit: 体量阈值与重复定义扫描纳入门禁。

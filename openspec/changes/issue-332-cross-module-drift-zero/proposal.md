# 提案：issue-332-cross-module-drift-zero

## 背景

`cross-module:check` 当前依赖 baseline 白名单放行 16 项已登记漂移（alias / missing channel / missing error code / envelope drift）。
这使门禁虽然显示 PASS，但并未实现“零漂移对齐”，且白名单条目已与 IPC 命名治理（3 段式 + 小写资源/动作）和现网实现长期分叉。

## 变更内容

- 取消本次 16 项漂移对应的 baseline 例外，要求以真实契约对齐而非登记放行。
- 对齐并补齐跨模块契约能力：
  - 新增 `ai:chat:send` 与 `export:project:bundle` 通道；
  - 将流式推送拆分为 `skill:stream:chunk` / `skill:stream:done`，并纳入 cross-module gate 实际通道采样；
  - 补齐跨模块规范要求的错误码字典项。
- 在本次 change 中统一规范冲突：
  - `knowledge:query:byIds` 与命名治理冲突，统一为 `knowledge:query:byids`；
  - `skill:execute` / `skill:cancel` 与 3 段式命名冲突，统一为 `ai:skill:run` / `ai:skill:cancel`；
  - `export:project` 与 3 段式命名冲突，统一为 `export:project:bundle`；
  - envelope 统一为 IPC 主规范已落地的 `ok` 语义，消除 `success` vs `ok` 漂移。

## 受影响模块

- Cross Module Integration — `openspec/specs/cross-module-integration-spec.md`（通过 delta 统一命名与 envelope）
- Skill System — `openspec/specs/skill-system/spec.md`（通过 delta 统一执行/取消通道命名）
- Document Management — `openspec/specs/document-management/spec.md`（通过 delta 统一项目导出通道命名）
- IPC Contract SSOT — `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- IPC Runtime/Bridge — `apps/desktop/main/src/ipc/ai.ts`, `apps/desktop/preload/src/aiStreamBridge.ts`, `packages/shared/types/ai.ts`
- Guard & Baseline — `scripts/cross-module-contract-gate.ts`, `openspec/guards/cross-module-contract-baseline.json`

## 不做什么

- 不引入新的门禁 required check 名称（保持 `ci` / `openspec-log-guard` / `merge-serial`）。
- 不做与本次 16 项漂移无关的 IPC 重构。
- 不直接修改 `openspec/specs/**` 主规范（仅在 delta spec 中声明变更）。

## 审阅状态

- Owner 审阅：`PENDING`

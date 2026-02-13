# 提案：issue-499-fix-kg-aliases-ipc-contract

## 背景

`p2-kg-aliases` 已在 KG service 层新增并持久化 `aliases`，但 IPC 运行时契约 `ipc-contract.ts` 的 `KG_ENTITY_SCHEMA` 及相关 request schema 未同步。`createValidatedIpcMain` 在 response 校验阶段将合法实体响应判定为“包含未声明字段”，并转换为 `INTERNAL_ERROR`，导致 Windows E2E 的 `knowledge:entity:list` 失败。

## 变更内容

- 修改 `apps/desktop/main/src/ipc/contract/ipc-contract.ts`：
  - `KG_ENTITY_SCHEMA` 新增 `aliases: string[]`
  - `knowledge:entity:create.request` 新增 `aliases?: string[]`
  - `knowledge:entity:update.request.patch` 新增 `aliases?: string[]`
- 修改 `apps/desktop/main/src/ipc/knowledgeGraph.ts` payload 类型，保持 handler 入参与契约一致。
- 运行 `pnpm contract:generate` 同步 `packages/shared/types/ipc-generated.ts`。
- 新增 IPC 运行时回归测试，覆盖“`knowledge:entity:list` 响应包含 aliases 仍应通过契约校验”。

## 受影响模块

- ipc delta：`openspec/changes/issue-499-fix-kg-aliases-ipc-contract/specs/ipc/spec.md`
- ipc 实现：
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/knowledgeGraph.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`

## 不做什么

- 不修改 `kgService` 的 aliases 持久化行为（已由 `p2-kg-aliases` 交付）
- 不新增 KG UI 字段或交互
- 不调整错误码字典与超时策略

## 依赖关系

- 上游依赖：`openspec/changes/archive/p2-kg-aliases`（实体模型已包含 `aliases`）
- 下游依赖：无

## Dependency Sync Check

- 核对输入：
  - `kgService.ts` 的 `KnowledgeEntity.aliases: string[]`
  - IPC runtime validation 的 object 额外字段拒绝规则
- 核对项：
  - 数据结构：KG entity/create/update payload 已支持 `aliases`（service 与 IPC handler 类型需一致）
  - IPC 契约：`knowledge:entity:create|list|update` 的 request/response 需声明 `aliases`
  - 错误码：契约匹配后不应再触发 `INTERNAL_ERROR`
  - 阈值：无新增阈值
- 结论：`DRIFT_FOUND`（已识别并在本 change 修复）

## Codex 实现指引

- 目标文件路径：
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/knowledgeGraph.ts`
  - `apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
  - `packages/shared/types/ipc-generated.ts`
- 验证命令：
  - `pnpm tsx apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
  - `pnpm contract:check`
  - `pnpm -C apps/desktop typecheck`
- Mock 要求：使用 in-memory SQLite + fake ipcMain，禁止真实网络与 LLM 调用

## 审阅状态

- Owner 审阅：`PENDING`

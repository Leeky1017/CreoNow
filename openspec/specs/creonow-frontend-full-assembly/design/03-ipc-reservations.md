# Design 03 — IPC Reservations（后端接口位预留清单）

> Spec: `../spec.md#cnfa-req-007`

本文件的目标：把“前端组装到完全体”所需的后端（main）接口位列清楚，并严格遵循 IPC Envelope 语义：

- 成功：`{ ok: true, data }`
- 失败：`{ ok: false, error: { code, message, details? } }`

## 0) SSOT 与生成

- IPC 契约 SSOT：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- 生成输出：`packages/shared/types/ipc-generated.ts`

任何新增/修改通道都必须：

1. 先改契约（schema）
2. 再运行 `pnpm contract:generate`
3. typecheck + E2E 覆盖关键路径

## 1) 已存在但前端未组装/未用好的通道（优先复用）

| 能力 | 通道 | 备注 |
| --- | --- | --- |
| Export | `export:markdown` / `export:pdf` / `export:docx` | pdf/docx 当前后端可能返回 `UNSUPPORTED`，前端必须正确展示（不要“看起来能选但导不出”）。 |
| Stats | `stats:getToday` / `stats:getRange` | 可用于 RightPanel Info 或 Analytics。 |
| Judge | `judge:model:getState` / `judge:model:ensure` | Quality 面板必须接入真实状态与降级语义。 |
| Constraints | `constraints:get` / `constraints:set` | Quality/Settings 需要接入。 |
| KG | `kg:graph:get` / `kg:entity:*` / `kg:relation:*` | 本规范建议 Characters 复用 KG 作为 SSOT。 |
| Documents | `file:document:*` | 模板应用（可选）可用 create + write 组合实现。 |
| Version | `version:list` / `version:restore` | compare 需要补 `version:read`（见 §2）。 |
| AI Proxy | `ai:proxy:settings:get` / `ai:proxy:settings:update` / `ai:proxy:test` | SettingsDialog 需要组装这些设置项。 |

## 2) 需要新增的通道（本规范要求预留/实现）

### 2.1 Projects：Dashboard 的 rename/duplicate/archive

现状：只有 `project:create/list/getCurrent/setCurrent/delete`。

需要新增（建议命名，最终以实现为准，但必须有稳定语义）：

#### `project:rename`

- Request：
  - `projectId: string`
  - `name: string`
- Response：
  - `projectId: string`
  - `name: string`
  - `updatedAt: number`
- Errors：
  - `INVALID_ARGUMENT`（空字符串/超长等）
  - `NOT_FOUND`（projectId 不存在）
  - `DB_ERROR`

#### `project:duplicate`

- Request：
  - `projectId: string`
  - `name?: string`（可选：新名字；默认 `<old> (copy)`）
- Response：
  - `projectId: string`（新项目）
  - `rootPath: string`
- Errors：同上，外加必要的 `IO_ERROR`（若涉及文件系统复制）

#### `project:archive`（或 `project:setArchived`）

- Request：
  - `projectId: string`
  - `archived: boolean`
- Response：
  - `projectId: string`
  - `archived: boolean`
  - `updatedAt: number`
- Errors：同上

> 说明：archive 的实现可能需要 DB schema 增加字段（例如 `archived_at`）。任务卡中必须给出迁移与回滚语义。

### 2.2 Versions：compare 需要 `version:read`

现状：前端 compare 仍为 placeholder；AppShell compare mode `diffText` 为空。

必须新增：

#### `version:read`

- Request：
  - `documentId: string`
  - `versionId: string`
- Response（建议）：
  - `documentId: string`
  - `versionId: string`
  - `actor: "user" | "auto" | "ai"`
  - `reason: string`
  - `contentJson: string`
  - `contentText: string`
  - `contentMd: string`
  - `contentHash: string`
  - `createdAt: number`
- Errors：
  - `INVALID_ARGUMENT`
  - `NOT_FOUND`
  - `DB_ERROR`

可选（MAY）：`version:diff`

- 若实现端想在 main 生成 diff（保证一致性），可增加 `version:diff`；否则保持 renderer 侧用 `unifiedDiff` 生成。

## 3) Characters 复用 KG 的数据约定（推荐：不新增新表/新通道）

为避免引入第二套“人物系统 SSOT”，本规范推荐：

- Characters = Knowledge Graph Entities 的一个子集
  - `entityType = "character"`（或固定值，大小写必须统一）
  - `metadataJson` 以 JSON 字符串存储人物详情（role/group/traits 等）
- Relationships = Knowledge Graph Relations
  - `relationType` 可复用 `features/character/types.ts` 的枚举值（例如 `"ally" | "enemy"`），或在 metadataJson 中补充

前端实现方式：

- Characters 面板读写走 `kg:graph:get` / `kg:entity:update` / `kg:relation:*`
- Characters 只是一种“KG 的特定视图”，不新建 `character:*` IPC

## 4) Export 的错误语义（必须一致）

当后端不支持某格式：

- MUST 返回：`{ ok: false, error: { code: "UNSUPPORTED", message: <human readable> } }`
- 前端 MUST：
  - 在 UI 中禁用该选项，或在点击时显示明确的不可用提示（推荐：禁用 + tooltip）
  - 禁止 silent failure / 只打印 console


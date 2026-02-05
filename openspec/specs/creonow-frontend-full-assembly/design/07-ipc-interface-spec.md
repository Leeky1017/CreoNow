# Design 07 — IPC Interface Spec（请求/响应/错误码/任务映射）

> Spec: `../spec.md#cnfa-req-003`
>
> 本文件是 `design/03-ipc-reservations.md` 的“可执行细化版”：把接口位写到可直接实现/可直接写测试的程度，并明确与 P0 任务的映射关系。

## 0) 约束与 SSOT

- IPC 契约 SSOT：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- codegen 输出：`packages/shared/types/ipc-generated.ts`
- 所有 invoke MUST 返回 Envelope：
  - 成功：`{ ok: true, data }`
  - 失败：`{ ok: false, error: { code, message, details? } }`
- **统一超时（MUST）**：所有新增 IPC 的 renderer 侧调用 MUST 设置 30 秒超时（30000ms）。超时后 MUST 返回 `{ ok: false, error: { code: "TIMEOUT", message: "Request timed out after 30s" } }`。

### 0.1 统一错误码（必须使用现有集合）

错误码集合见 `IPC_ERROR_CODES`（`apps/desktop/main/src/ipc/contract/ipc-contract.ts`）。本规范新增接口不得随意引入新 error code。

常用约定（MUST）：

- `INVALID_ARGUMENT`：参数空/非法/超限
- `NOT_FOUND`：目标资源不存在
- `CONFLICT`：并发写入冲突（如需要）
- `IO_ERROR`：文件系统读写失败
- `DB_ERROR`：数据库失败
- `UNSUPPORTED`：后端明确不支持该能力/格式
- `TIMEOUT`：超时（若实现了 timeout 语义）
- `INTERNAL`：未分类的内部错误（应尽量避免直接暴露）

---

## 1) Task ↔ IPC 映射（总览）

| P0 任务 | 需要实现/使用的 IPC | 新增？ |
| --- | --- | --- |
| P0-003 SettingsDialog | `ai:proxy:settings:get/update/test`, `judge:model:getState/ensure`, `stats:*` | 否 |
| P0-004 ExportDialog | `export:markdown/pdf/docx` | 否（但需完善 UNSUPPORTED 前端语义） |
| P0-005 Dashboard actions | `project:rename`, `project:duplicate`, `project:archive` | ✅ 新增 |
| P0-007 Version history | `version:read`（+ 复用 `version:list/restore`） | ✅ 新增 |
| P0-008 Characters via KG | `kg:*` | 否 |
| P0-009 KG visualization | `kg:*` | 否 |
| P0-010 RightPanel Quality | `judge:model:*`, `constraints:get/set`, `stats:*` | 否 |
| P0-012 SystemDialog unify | N/A（UI 层） | 否 |

---

## 2) Projects（Dashboard 闭环）

### 2.0 现有通道（已存在）

- `project:create` → `{ projectId, rootPath }`
- `project:list` → `{ items[] }`
- `project:getCurrent` / `project:setCurrent`
- `project:delete`

### 2.1 新增：`project:rename`（P0-005）

**Why**：Dashboard 上必须支持 rename（CNFA-REQ-004）。

- Request
  - `projectId: string`
  - `name: string`
- Response
  - `projectId: string`
  - `name: string`
  - `updatedAt: number`
- Validation（MUST）
  - `projectId` 非空
  - `name.trim()` 非空
  - `name` 长度上限 MUST 为 1–80 字符（含）
- Errors（MUST）
  - `INVALID_ARGUMENT`（空/超长）
  - `NOT_FOUND`
  - `DB_ERROR`

### 2.2 新增：`project:duplicate`（P0-005）

**Why**：Dashboard 上必须支持 duplicate（CNFA-REQ-004）。

- Request
  - `projectId: string`
  - `name?: string`（可选：新名字）
- Response
  - `projectId: string`（新项目）
  - `rootPath: string`
- Semantics（MUST）
  - 新项目必须出现在 `project:list`
  - 若 `name` 未提供，命名规则 MUST 为 `"<old> (copy)"`；若已存在同名则追加数字后缀 `"<old> (copy 2)"`、`"<old> (copy 3)"` 依此类推
  - **复制范围（MUST）**：V1 只复制"项目元数据 + documents + KG entities/relations"；不复制 user memory learned、不复制 AI 聊天历史
- Errors（MUST）
  - `INVALID_ARGUMENT`
  - `NOT_FOUND`
  - `IO_ERROR`（若涉及文件系统复制）
  - `DB_ERROR`
  - `TIMEOUT`（统一 30s）

### 2.3 新增：`project:archive`（P0-005）

**Why**：Dashboard 上必须支持 archive（CNFA-REQ-004）。

- Request
  - `projectId: string`
  - `archived: boolean`
- Response
  - `projectId: string`
  - `archived: boolean`
  - `updatedAt: number`
- Semantics（MUST）
  - **归档行为（MUST）**：归档后 MUST 从默认列表隐藏；`project:list` MUST 支持 `includeArchived?: boolean` 参数（默认 `false`）
- Errors（MUST）
  - `INVALID_ARGUMENT`
  - `NOT_FOUND`
  - `DB_ERROR`

---

## 3) Versions（compare/diff/restore 闭环）

### 3.0 现有通道（已存在）

- `version:list`：按 documentId 列出版本条目（含 actor/reason/hash/createdAt）
- `version:restore`：恢复指定 versionId（documentId + versionId）

### 3.1 新增：`version:read`（P0-007）

**Why**：compare 必须读取历史内容（CNFA-REQ-006）。

- Request
  - `documentId: string`
  - `versionId: string`
- Response（MUST 保持与 documents 字段一致）
  - `documentId: string`
  - `projectId: string`
  - `versionId: string`
  - `actor: "user" | "auto" | "ai"`
  - `reason: string`
  - `contentJson: string`
  - `contentText: string`
  - `contentMd: string`
  - `contentHash: string`
  - `createdAt: number`
- Errors（MUST）
  - `INVALID_ARGUMENT`
  - `NOT_FOUND`
  - `DB_ERROR`

本规范规定（MUST）：

- diff 文本生成 MUST 由 renderer 侧 `unifiedDiff` 负责（便于 UI 迭代与测试）
- main 仅负责提供历史内容（`version:read`）与 restore 写入
- 禁止在 main 新增 `version:diff` 通道（避免双栈实现）

---

## 4) Export（对话框 + UNSUPPORTED 语义）

### 4.1 现有通道（已存在）

- `export:markdown` / `export:pdf` / `export:docx`
- Response：`{ relativePath: string, bytesWritten: number }`

### 4.2 错误语义（必须一致）

- 后端不支持 pdf/docx 时 MUST 返回：
  - `{ ok: false, error: { code: "UNSUPPORTED", message: <human readable> } }`
- 前端 MUST：
  - 在 UI 禁用该选项（推荐）或点击后提示不可用（不得误导）
  - 显示 `code: message`

---

## 5) Judge / Constraints（Quality 真接电）

### 5.1 Judge（已存在）

- `judge:model:getState`
- `judge:model:ensure`（可选 `timeoutMs`）

前端规则（MUST）：

- ensure 期间必须呈现可观察状态（downloading/running）
- 失败必须显示错误码与说明

### 5.2 Constraints（已存在）

- `constraints:get` / `constraints:set`（project-scoped）

前端规则（MUST）：

- `constraints:get` 失败不得“当作空 constraints”（否则属于 silent failure）

---

## 6) Knowledge Graph（Characters 复用 KG）

KG IPC 已存在：`kg:graph:get`, `kg:entity:*`, `kg:relation:*`。

本规范约定（MUST）：

- Characters MUST NOT 新增 `character:*` IPC（使用 KG 作为 SSOT）
- MUST 用 `entityType="character"` + `metadataJson` 表达角色细节
- `metadataJson` 的 schema MUST 为：`{ name: string, description?: string, avatar?: string, traits?: string[] }`

错误语义（MUST）：

- metadataJson 非法不得崩溃：renderer MUST 降级为默认值 `{ name: "<entity.name>", description: "", avatar: "", traits: [] }` 并在 console.warn 记录

---

## 7) 文档/模板（CreateProjectDialog 的“模板语义”）

本规范选定路径 A（MUST）：

### 7.1 路径 A（MUST）：P0 暂不支持模板应用 → UI 明确禁用

- CreateProjectDialog 的 template/description/cover 字段 MUST 标注为 "Coming soon" 并禁用交互（`disabled` + `aria-disabled`）
- MUST 只提交 `project:create(name)`，避免误导
- 此为 P0 范围；真模板应用见 P1-001

### 7.2 路径 B（P1）：支持模板应用（使用现有 documents IPC）

> 本路径属于 P1 范围，P0 禁止实现。

- 选择模板后，在项目创建完成时：
  - 通过 `file:document:create` + `file:document:write` 创建模板结构
- 需要写死：
  - 模板文件名规则、默认文档、错误回滚策略

对应任务：`P1-001`（见 `task_cards/p1/P1-001-project-metadata-description-cover.md`）

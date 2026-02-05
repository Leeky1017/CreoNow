# Design 02 — Dashboard Project Actions（Rename / Duplicate / Archive）

> Spec: `../spec.md#cnmvp-req-001`
>
> Related cards: `../task_cards/p0/P0-001-dashboard-project-actions-rename-duplicate-archive.md`

本文件写死 Dashboard 项目操作的**语义**与**UI 交互**，避免执行者“按自己理解”导致体验不一致或实现走样。

## 1) 操作语义（必须写死）

### 1.1 Rename

- 目标：修改 `projects.name`
- 约束：
  - 空字符串/全空白 → `INVALID_ARGUMENT`
  - 超长（> 120 chars）→ `INVALID_ARGUMENT`（阈值写死在任务卡）
- 成功后：
  - `updated_at` 变更
  - Dashboard 列表立即更新；重启后保持

### 1.2 Duplicate（MVP 语义）

- 目标：创建新项目（新 `projectId` + 新 `rootPath`），并复制“可见内容”的最小集合
- MVP 写死的复制范围：
  - MUST 复制：SQLite `documents`（新 `document_id`，内容/标题复制）
  - MUST NOT 复制：`document_versions`（新项目从 0 版本开始；原因：避免复杂迁移与体积膨胀）
  - SHOULD 复制：源项目 `<rootPath>/.creonow/`（若存在；失败不阻断 duplicate，但必须可观测）
- 命名：
  - 新项目名 = `${oldName} (Copy)`；若 `oldName` 为空则 `Untitled (Copy)`

### 1.3 Archive（必须可恢复）

Archive 不是 delete。MVP 语义写死为：

- DB：`projects.archived_at`（nullable）作为单一事实源
- `project:archive` 接受 `archived: true|false`（同一通道负责 archive/unarchive）
- Dashboard 默认只展示 `archived_at IS NULL` 的项目
- Dashboard 必须提供 “Archived” 分组入口：用户能看到已归档项目，并能执行 Unarchive

> 为什么强制可恢复：避免 archive 变相 delete，且符合常见桌面应用语义。

## 2) UI 交互（写死，避免实现漂移）

### 2.1 ProjectCard Menu

在 `DashboardPage.tsx` 的 ProjectCard menu（dropdown + context menu）保持一致：

- Active 项目：Open / Rename / Duplicate / Archive / Delete
- Archived 项目：Open / Rename / Duplicate / Unarchive / Delete

### 2.2 Rename Dialog

- 触发：Menu → Rename
- 形式：使用 primitives `Dialog`，包含：
  - Title: `Rename Project`
  - Input（自动 focus，回车提交，Esc 关闭）
  - Buttons: `Cancel` / `Save`
- 交互：
  - 保存中禁用按钮与 input
  - 错误展示：Dialog 内联 ErrorState（或等价 patterns），且错误码可见（便于 E2E）

### 2.3 Duplicate

- 触发：Menu → Duplicate
- 形式：不需要确认对话框（非破坏性）
- 反馈：
  - Duplicate 过程中可用 toast 或 card-level loading（实现写死在任务卡）
  - 完成后新项目出现在列表顶部（因为 updatedAt 最新）

### 2.4 Archive / Unarchive Confirm

- 触发：Menu → Archive / Unarchive
- 形式：必须确认（使用 `useConfirmDialog` + SystemDialog）
  - Archive 文案：
    - title: `Archive Project?`
    - description: `You can restore it later from Archived projects.`
    - primaryLabel: `Archive`
    - secondaryLabel: `Cancel`
  - Unarchive 文案：
    - title: `Restore Project?`
    - description: `This project will return to your active list.`
    - primaryLabel: `Restore`
    - secondaryLabel: `Cancel`

## 3) IPC 契约（执行必须对齐）

> 具体 schema 见任务卡 Expected File Changes；这里写语义。

- `project:rename`：{ projectId, name } → { projectId, name, updatedAt }
- `project:duplicate`：{ projectId } → { projectId, rootPath, name }
- `project:archive`：{ projectId, archived } → { projectId, archived, archivedAt }

并且 `project:list` 必须包含 `archivedAt` 字段，且 request 增加 `includeArchived?: boolean`。


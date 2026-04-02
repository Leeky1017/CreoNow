# Version Control Specification

## P1 变更摘要

本次为 P1（系统脊柱）阶段新增以下变更：

| 变更 | 描述 |
|------|------|
| P1 — 线性快照 | 简化版本管理，去掉分支/合并/冲突，只保留线性快照序列 |
| P1 — 三阶段提交 | AI 写入的安全保障：快照 → 写入 → 确认/回退 |
| P1 — content 格式变更 | 从 TipTap JSON 改为 ProseMirror State JSON |
| P1 — 推迟项 | 分支管理、三方合并、冲突解决推迟到 P3+ |

### ⚠️ P1 与现有 Spec 的差异

1. **content 格式**：现有 spec 定义 content 为"TipTap JSON 完整内容"，P1 改为 ProseMirror State JSON（因编辑器从 TipTap 迁移到 ProseMirror）
2. **分支管理**：现有 spec 的「分支管理、合并与冲突解决」Requirement 在 P1 阶段不实现，推迟到 P3+
3. **多版本对比**：现有 spec 支持最多 4 版本对比，P1 仅支持 2 版本对比

---

## Purpose

管理写作版本：快照生成与存储、AI 修改标记（actor=ai）、任意两版本 Diff 对比、一键恢复历史版本。

### Scope

| Layer    | Path                                     |
| -------- | ---------------------------------------- |
| Backend  | `main/src/services/version/`             |
| IPC      | `main/src/ipc/version.ts`                |
| Frontend | `renderer/src/features/version-history/` |
| Store    | `renderer/src/stores/versionStore.tsx`   |

## Requirements

### Requirement: P1 — 线性快照（简化版本管理）

> **P1 决策**：V1 版本控制大幅简化——不做分支管理、不做三方合并、不做冲突解决。只做线性快照。

系统**必须**在每次 AI 写入前自动创建快照。快照为线性序列，无分支结构，通过 `parentSnapshotId` 形成链表。

快照内容**必须**存储为 ProseMirror State JSON（非 TipTap JSON——P1 决策：编辑器从 TipTap 迁移到 ProseMirror）。

#### 数据模型

```typescript
interface LinearSnapshot {
  id: string;
  documentId: string;
  projectId: string;
  content: ProseMirrorStateJSON; // P1 变更：不是 TipTap JSON
  actor: 'user' | 'auto' | 'ai';
  reason: 'manual-save' | 'autosave' | 'ai-accept' | 'ai-partial-accept' | 'pre-write' | 'rollback' | 'pre-rollback';
  wordCount: number;
  parentSnapshotId: string | null; // 线性链表，指向上一个快照
  createdAt: string; // ISO8601
}
```

#### 快照触发时机

| 触发时机                   | actor  | reason        |
| -------------------------- | ------ | ------------- |
| 用户手动保存（Cmd/Ctrl+S） | `user` | `manual-save` |
| 自动保存（debounce 500ms） | `auto` | `autosave`    |
| AI 写入前                  | `auto` | `pre-write`   |
| AI 修改被用户接受后        | `ai`   | `ai-accept`   |
| AI 修改被部分接受后（P2）  | `ai`   | `ai-partial-accept` |
| 回滚前保存当前状态         | `user` | `pre-rollback`|
| 回滚完成                   | `user` | `rollback`    |

#### 线性约束

- 每个快照的 `parentSnapshotId` 指向前一个快照，形成单链表
- 不存在分叉——同一个 `parentSnapshotId` 最多被一个后续快照引用
- 快照一旦创建不可修改（append-only）

#### Scenario: AI 写入前自动创建快照

- **假设** 用户在文档「第三章」中触发 AI 润色
- **当** AI 开始写入前
- **则** 系统自动创建快照，actor 为 `auto`，reason 为 `pre-write`
- **并且** 该快照的 `parentSnapshotId` 指向上一个最新快照

#### Scenario: 快照链表完整性

- **假设** 文档已有 10 个线性快照
- **当** 用户手动保存创建第 11 个快照
- **则** 第 11 个快照的 `parentSnapshotId` 等于第 10 个快照的 `id`
- **并且** 从最新快照沿 `parentSnapshotId` 可遍历到第 1 个快照（`parentSnapshotId = null`）

---

### Requirement: P1 — 三阶段提交（AI 写入安全保障）

AI 写入**必须**遵循三阶段提交流程，确保用户始终可以回退到 AI 写入前的状态。

#### 数据模型

```typescript
interface ThreeStageCommit {
  stage: 'snapshot-created' | 'ai-writing' | 'user-confirmed' | 'user-rejected';
  preWriteSnapshotId: string;
  documentId: string;
  executionId: string; // 关联到 Skill 执行
}
```

#### 三阶段流程

| 阶段 | 动作 | 系统行为 |
|------|------|---------|
| Stage 1: 创建快照 | AI 写入前 | 创建 `pre-write` 快照，记录当前文档状态 |
| Stage 2: AI 写入 | AI 将内容写入编辑器 | 以 Inline Diff 形式展示变更，stage 变为 `ai-writing` |
| Stage 3: 用户确认 | 用户 Accept 或 Reject | Accept → 创建 `ai-accept` 快照；Reject → 回退到 `pre-write` 快照 |

#### Scenario: 用户接受 AI 写入

- **假设** AI 已完成对「第三章」的润色，Inline Diff 正在展示
- **当** 用户点击 Accept
- **则** 系统创建 `ai-accept` 快照，actor 为 `ai`
- **并且** Inline Diff 消失，AI 修改内容融入文档
- **并且** `ThreeStageCommit.stage` 变为 `user-confirmed`

#### Scenario: 用户拒绝 AI 写入

- **假设** AI 已完成对「第三章」的润色，Inline Diff 正在展示
- **当** 用户点击 Reject
- **则** 系统回退文档到 `preWriteSnapshotId` 对应的快照内容
- **并且** Inline Diff 消失，文档恢复到 AI 写入前的状态
- **并且** `ThreeStageCommit.stage` 变为 `user-rejected`

#### Scenario: AI 写入过程中断（异常安全）

- **假设** AI 写入过程中发生异常（如网络断开）
- **当** 系统检测到写入中断
- **则** 文档可通过 `preWriteSnapshotId` 回退到写入前状态
- **并且** `ThreeStageCommit.stage` 保持 `ai-writing`，供恢复流程使用

---

### Requirement: P1 — 推迟项声明

以下功能在 P1 阶段**不实现**，推迟到 P3+ 阶段：

| 推迟项 | 现有 Spec 位置 | 推迟原因 |
|--------|---------------|---------|
| 分支管理 | 「分支管理、合并与冲突解决」Requirement | V1 只做线性快照，不需要分支 |
| 三方合并 | 同上 | 无分支则无合并需求 |
| 冲突解决 | 同上 | 无合并则无冲突 |
| 4 版本同时对比 | 「版本对比（Diff）」Requirement | P1 仅支持 2 版本对比 |

#### P1 content 格式变更

现有 spec 中 `content` 字段定义为"TipTap JSON 完整内容"。P1 起，`content` 字段类型变更为 **ProseMirror State JSON**，原因是编辑器从 TipTap 迁移到 ProseMirror。

此变更影响以下接口：
- `version:snapshot:create` 的请求体
- `version:snapshot:read` 的响应体
- `version:snapshot:diff` 的输入输出
- `version:snapshot:rollback` / `version:snapshot:restore` 的恢复内容

---

### Requirement: 版本快照生成与存储

系统**必须**在以下时机自动生成文档版本快照：

| 触发时机                   | actor  | reason          |
| -------------------------- | ------ | --------------- |
| 用户手动保存（Cmd/Ctrl+S） | `user` | `manual-save`   |
| 自动保存（debounce 500ms） | `auto` | `autosave`      |
| AI 修改被用户接受后        | `ai`   | `ai-accept`     |
| 文档状态变更（草稿↔定稿）  | `user` | `status-change` |

> **P1 新增 reason**：`pre-write`（AI 写入前快照）、`pre-rollback`（回滚前快照）、`rollback`（回滚操作）。这些定义在本 spec P1 section 的 `LinearSnapshot` 接口中。`status-change` 在 V1 保留，用于文档状态变更场景。

每个版本快照**必须**包含：`id`、`documentId`、`projectId`、`content`（ProseMirror State JSON）、`actor`（`user` | `auto` | `ai`）、`reason`、`wordCount`、`createdAt`。

版本快照通过以下 IPC 通道管理：

| IPC 通道                  | 通信模式         | 方向            | 用途               |
| ------------------------- | ---------------- | --------------- | ------------------ |
| `version:snapshot:create` | Request-Response | Renderer → Main | 创建版本快照       |
| `version:snapshot:list`   | Request-Response | Renderer → Main | 列出文档的版本历史 |
| `version:snapshot:read`   | Request-Response | Renderer → Main | 读取某个版本内容   |

为控制存储空间，系统**应该**对高频自动保存版本进行合并（如 5 分钟内的多次 autosave 合并为一个快照），保留用户手动保存和 AI 修改的所有快照。

#### Scenario: 用户手动保存生成版本快照

- **假设** 用户正在编辑文档「第三章」
- **当** 用户按下 `Cmd/Ctrl+S`
- **则** 系统通过 `version:snapshot:create` 创建快照，actor 为 `user`，reason 为 `manual-save`
- **并且** 版本历史列表新增一条记录

#### Scenario: AI 修改被接受后生成版本快照

- **假设** 用户通过 Inline Diff 接受了 AI 的润色结果
- **当** AI 修改应用到文档
- **则** 系统自动创建版本快照，actor 为 `ai`，reason 为 `ai-accept`
- **并且** 该快照在版本历史中可追溯

#### Scenario: 自动保存版本合并

- **假设** 用户在 3 分钟内连续编辑触发了 15 次 autosave
- **当** 系统执行版本合并策略
- **则** 5 分钟时间窗口内的 autosave 快照合并为 1 个
- **并且** 保留最新的 autosave 内容作为合并后的快照

---

### Requirement: 版本历史入口与展示

系统**必须**提供专门的版本管理入口，不作为隐藏功能。

版本历史入口：

- 右键文档菜单中的「版本历史」选项
- Info 面板中的「查看版本历史」链接
- 快捷操作（命令面板中搜索「版本历史」）

版本历史以**时间线列表**形式在专用面板中展示：

- 每条版本记录显示：时间戳、actor 标识（用户/自动/AI）、reason 描述、字数变化（+N / -N）
- 列表按时间降序排列（最新在上）
- actor 标识使用不同图标区分：用户操作（人物图标）、自动保存（时钟图标）、AI 修改（AI 图标）

版本历史面板组件**必须**有 Storybook Story，覆盖：有多个版本的默认态、仅一个版本的最简态、加载态。

#### Scenario: 用户打开版本历史

- **假设** 文档「第三章」有 20 个历史版本
- **当** 用户通过右键菜单选择「版本历史」
- **则** 版本历史面板打开，显示时间线列表
- **并且** 每条记录标注 actor 类型和字数变化

#### Scenario: 版本历史中的 actor 标识

- **假设** 版本历史中有用户手动保存、自动保存和 AI 修改的混合记录
- **当** 面板渲染版本列表
- **则** 用户手动保存项显示人物图标
- **并且** 自动保存项显示时钟图标
- **并且** AI 修改项显示 AI 图标

---

### Requirement: AI 修改标记与区分显示

AI 的修改和用户的修改**默认不区分**显示。用户**可以**在设置中选择开启区分显示。

开启区分显示后：

- 版本历史中 AI 生成的版本标注「AI 修改」标签（使用 `--color-info` 背景）
- Diff 对比中，AI 修改的内容使用虚线下划线标记，与用户修改的实线下划线区分

区分显示偏好持久化到 `creonow.editor.showAiMarks`。

#### Scenario: 用户开启 AI 修改区分显示

- **假设** 用户在设置中开启「区分 AI 修改」选项
- **当** 用户查看版本历史
- **则** AI 生成的版本记录额外显示「AI 修改」标签
- **并且** 在 Diff 对比中，AI 修改的部分使用虚线下划线

#### Scenario: 默认模式不区分 AI 修改

- **假设** 用户未开启「区分 AI 修改」选项（默认）
- **当** 用户查看版本历史
- **则** 所有版本记录统一显示，不特殊标注 AI 修改

---

### Requirement: 版本预览

用户**必须**能够点击任意历史版本进行只读预览。

预览行为：

- 点击版本记录后，主编辑区切换为只读预览模式
- 预览模式顶部显示提示条：「正在预览 [时间] 的版本」+ 「恢复到此版本」按钮 + 「返回当前版本」按钮
- 提示条使用 `--color-bg-raised` 背景，`--color-border-default` 下边框
- 预览模式下编辑器工具栏禁用，不可编辑

#### Scenario: 用户预览历史版本

- **假设** 版本历史面板显示多个版本
- **当** 用户点击「2 小时前」的版本记录
- **则** 编辑区切换为只读模式，显示该版本的内容
- **并且** 顶部提示条显示「正在预览 2 小时前的版本」
- **并且** 编辑器工具栏按钮全部禁用

#### Scenario: 用户从预览返回当前版本

- **假设** 用户正在预览历史版本
- **当** 用户点击提示条中的「返回当前版本」
- **则** 编辑区恢复为当前版本内容
- **并且** 提示条消失，编辑器恢复可编辑状态

---

### Requirement: 版本对比（Diff）

用户**必须**能够选择两个版本进行 Diff 对比。对比功能**必须**复用 Editor 模块的 `DiffViewPanel` 和 `MultiVersionCompare` 组件。

对比入口：

- 版本历史面板中选中一个版本后，点击「与当前版本对比」
- 或选中两个版本后点击「对比选中版本」

对比行为遵循 Editor spec 中「Diff 对比模式」需求的所有规范：

- 删除内容使用 `--color-error-subtle` 背景 + 红色删除线
- 新增内容使用 `--color-success-subtle` 背景 + 绿色文字
- 支持统一视图（Unified）和分栏视图（Split）
- 支持最多 4 个版本同时对比（`MultiVersionCompare` 2×2 网格）
- 支持同步滚动

版本对比通过 IPC 通道 `version:snapshot:diff`（Request-Response）获取 diff 数据。

#### Scenario: 用户对比历史版本与当前版本

- **假设** 用户在版本历史中选中「3 天前」的版本
- **当** 用户点击「与当前版本对比」
- **则** 系统通过 `version:snapshot:diff` 获取两个版本的差异
- **并且** `DiffViewPanel` 渲染，显示删除和新增内容
- **并且** 底部统计显示变化行数

#### Scenario: 两个版本内容完全相同

- **假设** 用户选择两个连续的自动保存版本（内容未变）
- **当** Diff 面板渲染
- **则** 显示「无差异」提示
- **并且** 统计显示「+0 行，-0 行」

---

### Requirement: 版本回滚

用户**必须**能够将文档恢复到任意历史版本。回滚操作**必须**安全——创建新版本作为恢复点，而非删除中间版本。

回滚流程：

1. 用户在版本历史或预览模式中点击「恢复到此版本」
2. 系统弹出确认对话框：「将文档恢复到 [时间] 的版本？当前内容将被保存为新版本。」
3. 用户确认后：
   a. 系统先将当前内容创建为新版本快照（actor: `user`，reason: `pre-rollback`）
   b. 再将目标版本的内容设置为当前文档内容
   c. 再创建一个恢复版本快照（actor: `user`，reason: `rollback`）
4. 编辑器加载恢复后的内容

恢复历史版本的公开 IPC 当前包含两条通道：

- `version:snapshot:rollback`：执行安全回滚，并返回 `preRollbackVersionId` / `rollbackVersionId`，供审计与后续可撤销操作追踪
- `version:snapshot:restore`：执行同一恢复动作，但只返回 `{ restored: true }`，供只关心成功状态的调用方使用

其中，用户触发「恢复到此版本」时，系统**必须**满足本 Requirement 定义的安全回滚语义；实现上可以使用上述任一公开通道，只要最终行为与快照产物保持一致。

回滚操作本身可撤销——因为中间版本未被删除，用户可以再次回滚到回滚前的版本。

#### Scenario: 用户回滚到历史版本

- **假设** 用户在预览「5 天前」的版本
- **当** 用户点击「恢复到此版本」并确认
- **则** 系统先保存当前内容为 `pre-rollback` 快照
- **并且** 将「5 天前」版本的内容设置为当前文档
- **并且** 创建 `rollback` 快照
- **并且** 编辑器显示恢复后的内容，可正常编辑

#### Scenario: 回滚后再次回滚（可撤销的回滚）

- **假设** 用户刚回滚到「5 天前」的版本
- **当** 用户发现回滚错误，打开版本历史找到 `pre-rollback` 快照
- **则** 用户可以再次回滚到 `pre-rollback` 版本
- **并且** 文档恢复到回滚前的状态

#### Scenario: 回滚确认被取消

- **假设** 系统弹出回滚确认对话框
- **当** 用户点击「取消」
- **则** 对话框关闭，文档内容不变
- **并且** 不创建任何新版本快照

---

### Requirement: P1 公开表面不包含 branch / conflict IPC

P1 版本系统的公开行为**必须**限定在线性快照、两版本 Diff 与回滚。

当前阶段对 renderer 暴露的版本管理 IPC surface 仅包括：

| IPC 通道                | 通信模式         | 方向            | 用途               |
| ----------------------- | ---------------- | --------------- | ------------------ |
| `version:snapshot:create` | Request-Response | Renderer → Main | 创建版本快照       |
| `version:snapshot:list`   | Request-Response | Renderer → Main | 列出文档的版本历史 |
| `version:snapshot:read`   | Request-Response | Renderer → Main | 读取某个版本内容   |
| `version:snapshot:diff`     | Request-Response | Renderer → Main | 计算两个版本差异   |
| `version:snapshot:restore`  | Request-Response | Renderer → Main | 恢复历史版本（最小响应） |
| `version:snapshot:rollback` | Request-Response | Renderer → Main | 安全回滚并返回恢复锚点 |

以下能力在 P1 **明确不属于公开 IPC surface**，仅保留为未来阶段说明：

- `version:branch:*`
- `version:conflict:*`
- 分支创建 / 切换 / 合并
- 冲突检测与人工解决 UI

#### Scenario: P1 renderer 只能使用线性版本通道

- **假设** renderer 需要展示版本历史、对比两个版本并执行回滚
- **当** 它接入版本管理模块
- **则** 只依赖 `version:snapshot:create`、`version:snapshot:list`、`version:snapshot:read`、`version:snapshot:diff`、`version:snapshot:restore`、`version:snapshot:rollback`
- **并且** 不要求也不假定 `version:branch:*` / `version:conflict:*` 存在

#### Scenario: 分支与冲突能力保留到未来阶段

- **假设** Owner 规划 P3+ 的分支写作工作流
- **当** 本 spec 描述未来扩展
- **则** 相关分支 / 合并 / 冲突能力仅作为未来阶段说明
- **并且** 不构成 P1 的当前 must requirement

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

本模块全部 Requirement 的统一可验收标准如下：

- 量化阈值：
  - 快照写入 p95 < 120ms
  - 历史列表查询 p95 < 200ms
  - 两版本 Diff 计算 p95 < 350ms
- 边界与类型安全：
  - `TypeScript strict` 必须开启
  - 当前公开的 `version:snapshot:create` / `version:snapshot:list` / `version:snapshot:read` / `version:snapshot:diff` / `version:snapshot:restore` / `version:snapshot:rollback` 通道必须由 zod 校验
  - `version:branch:*` / `version:conflict:*` 为未来阶段预留，不属于 P1 公开校验面
- 失败处理策略：
  - 数据一致性相关失败一律硬失败并阻断（不静默降级）
  - 可重试 IO 失败最多重试 3 次，超时 5s
  - 失败后返回结构化错误并记录 rollback checkpoint
- Owner 决策边界：
  - actor/reason 枚举、快照不可变性、回滚语义由 Owner 固定
  - Agent 不得引入“覆盖历史”的删除式回滚

#### Scenario: 快照与 Diff 指标达标

- **假设** 文档大小 30,000 字，历史版本 500 条
- **当** 连续执行 100 次快照与 100 次 Diff
- **则** 快照写入 p95 < 120ms
- **并且** Diff 计算 p95 < 350ms

#### Scenario: 数据库故障时保持可恢复状态

- **假设** 快照写入中途 SQLite 抛错
- **当** 主进程处理异常
- **则** 返回 `{ code: "DB_ERROR", message: "版本写入失败" }`
- **并且** 文档保持写前状态且存在可回滚检查点

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                                 |
| ------------ | -------------------------------------------- |
| 网络/IO 失败 | 快照写入失败、历史读取失败、回滚结果写入失败 |
| 数据异常     | 快照损坏、Diff 输入非法、回滚目标缺失        |
| 并发冲突     | 同文档快照/回滚并发、并发回滚               |
| 容量溢出     | 单文档快照超过 50,000 条                     |
| 权限/安全    | 非当前项目快照访问、跨项目快照读取越权       |

#### Scenario: 并发版本写操作触发串行锁

- **假设** 两个请求同时对同一文档执行 snapshot/rollback
- **当** 请求同时到达主进程
- **则** 系统按 `documentId` 加锁串行执行
- **并且** 后到请求必须等待前一次版本写操作完成后再继续

#### Scenario: 快照容量超限自动压缩

- **假设** 单文档快照数量达到 50,001
- **当** 新快照写入
- **则** 系统自动压缩 7 天前 autosave 快照并保留手动/AI/回滚快照
- **并且** 返回 `VERSION_SNAPSHOT_COMPACTED` 事件供 UI 展示

---

### Non-Functional Requirements

**Performance**

- `version:snapshot:create`：p50 < 60ms，p95 < 120ms，p99 < 250ms
- `version:snapshot:list`：p50 < 80ms，p95 < 200ms，p99 < 400ms

**Capacity**

- 单文档快照上限：50,000（超限自动压缩 autosave）
- 单次 Diff 最大输入：2 MB 文本（超限需分块）

**Security & Privacy**

- 快照内容必须按项目隔离存储，禁止跨项目读取
- 日志中仅记录 `snapshotId/documentId`，禁止记录正文原文
- 未来阶段若引入冲突解决，届时再补充操作人审计字段要求

**Concurrency**

- 同一 `documentId` 的 rollback/snapshot 操作必须串行
- 跨文档操作可并行，最大并发 8
- 并发回滚冲突返回 `VERSION_ROLLBACK_CONFLICT`

#### Scenario: 多文档并行版本操作

- **假设** 8 个文档同时触发快照
- **当** 版本服务并行处理
- **则** 所有请求在 p95 阈值内完成
- **并且** 各文档快照序列保持单调递增

#### Scenario: 超大 Diff 输入分块处理

- **假设** 用户对比两版总文本 3 MB
- **当** 触发 `version:snapshot:diff`
- **则** 系统返回 `{ code: "VERSION_DIFF_PAYLOAD_TOO_LARGE" }` 并提示启用分块对比
- **并且** 不发生主进程崩溃或 UI 卡死

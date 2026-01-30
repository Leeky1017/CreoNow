# 02 - Document Model SSOT（TipTap JSON / 派生字段 / 版本与 Apply）

> 上游 Requirement：`CNWB-REQ-020`、`CNWB-REQ-030`、`CNWB-REQ-050`  
> 目标：把“SSOT=TipTap JSON”的决策落到可实现的数据模型与失败语义上，避免实现阶段产生“双 SSOT/不可回滚”的系统性 bug。

---

## 1. 决策摘要（必须写死）

- V1 文档内容 SSOT = TipTap/ProseMirror JSON（以下简称 `content_json`）。
- `content_text` / `content_md` 为派生字段（derived），用于：
  - FTS/Embedding（索引与检索）
  - diff 展示（human readable）
  - 导出（P1+）
- derived 字段 MUST NOT 反写为 SSOT（不得用 markdown 再生成 json 去覆盖原 json）。

---

## 2. 数据模型（DB + 文件）建议

### 2.1 统一约束

- 所有持久化写入必须具备“可解释的版本节点”（见 §4）。
- 写入必须是事务性的：SSOT 写入成功才能落版本；版本写入失败必须回滚（不得出现“内容变了但版本没记”）。

### 2.2 推荐 DB 表（V1 最小）

> 具体 schema 由实现任务落地；本章固定字段语义与边界。

- `documents`
  - `id`（string）
  - `project_id`（string）
  - `title`（string）
  - `content_json`（TEXT, JSON string）—— SSOT
  - `content_text`（TEXT）—— derived
  - `content_md`（TEXT）—— derived
  - `content_hash`（TEXT）—— `hash(content_json)`
  - `updated_at`（number epoch ms）
- `document_versions`
  - `id`（string）
  - `document_id`（string）
  - `created_at`（number epoch ms）
  - `actor`（`user | ai | auto`）
  - `reason`（string，可选：`autosave` / `manual-save` / `ai-apply:<runId>`）
  - `content_json`（TEXT, JSON string）
  - `content_text`（TEXT）
  - `content_md`（TEXT）
  - `content_hash`（TEXT）
  - `diff_format`（`unified_text`）
  - `diff_text`（TEXT, unified diff；可为空）

### 2.3 文件系统落点（用于可观测与可移植）

- E2E 与诊断必须可定位真实文件与 DB：
  - `CREONOW_USER_DATA_DIR/data/creonow.db`
  - `CREONOW_USER_DATA_DIR/logs/main.log`
- 项目根目录建议：
  - `CREONOW_USER_DATA_DIR/projects/<projectId>/`（见 `design/04-context-engineering.md`）

> 注：文档是否落地为文件（例如 `documents/<id>.cn.json`）是实现选择；但一旦落地，必须保证“单事实源”：
>
> - 若 DB 为 SSOT：文件只能是 cache/导出，不得被读回覆盖。
> - 若 文件为 SSOT：DB 只能存索引/派生/版本，不得单独存另一份 `content_json`。
>
> V1 建议：**DB 为 SSOT**（最少双写点），文件系统用于 `.creonow/**` 与 logs。

---

## 3. 派生字段生成规则（必须确定）

### 3.1 `content_text` 生成（MUST）

- 输入：`content_json`（TipTap JSON）。
- 输出：纯文本（用于字数统计/FTS/embedding）。
- 规则：
  - MUST 以 ProseMirror 文档遍历顺序提取文本节点。
  - 段落/块级节点之间 MUST 插入 `\n`（保持可读分段）。
  - MUST 进行最小归一化：将 `\r\n` 统一为 `\n`；禁止额外 trim（避免 diff 不可解释）。

### 3.2 `content_md` 生成（SHOULD）

- 输入：`content_json`。
- 输出：Markdown（用于 diff 展示/导出）。
- 规则：
  - SHOULD 使用 TipTap 官方 markdown serializer（或等价）生成。
  - 必须确定性：同一 `content_json` MUST 生成字节一致的 markdown（空行数量、列表 marker、引用符号等规则固定）。
  - 若 serializer 不可用或失败：
    - MUST 返回可判定错误（`ENCODING_FAILED` 或 `INTERNAL`），并记录日志；
    - SHOULD 降级为 `content_text` 的 markdown-safe 版本（例如纯文本）以保证 diff 可用。

---

## 4. 版本历史（snapshot 策略）

### 4.1 actor 语义（MUST）

- `actor=user`：用户显式触发保存（菜单/快捷键）。
- `actor=auto`：自动保存生成的版本（必须可控：节流/去重）。
- `actor=ai`：AI Apply 成功后生成的版本（必须带 `runId` 关联）。

### 4.2 snapshot 触发（建议但必须可测）

- 自动保存：
  - 编辑器内容变化 → debounce → 写入 `documents` + 写入 `document_versions(actor=auto)`（去重：相同 `content_hash` 不写新版本）
- 手动保存：
  - 写入 `document_versions(actor=user)`（即便与上一版本相同，也可选择不写；但行为必须确定并写入测试）
- AI Apply：
  - Apply 成功（见 §5）→ 写入 `documents` + `document_versions(actor=ai, reason=ai-apply:<runId>)`

---

## 5. AI Apply（Diff → Confirm → Apply）语义（V1 最小可用）

### 5.1 适用范围（V1）

- 对“当前文档选区”的改写类技能：
  - AI 输出 = replacement text（替换选区文本）。
  - UI 展示 diff（旧选区 vs 新文本）。
  - Apply = 用 TipTap transaction 替换选区，并落版本（actor=ai）。
- 对“文本文件”的改写类技能（可选，见 `design/09-ai-runtime-and-network.md`）：
  - AI 输出 = unified diff patch（标准格式）。
  - Apply = 校验 base hash → 应用 patch → 写回文件 →（如该文件是当前文档来源）刷新 editor/索引。

### 5.2 冲突检测（MUST）

- 选区 Apply 必须携带 `selectionRef`（生成 diff 时的证据）：
  - `selectionTextHash`（hash 原始选区文本）
  - `selectionRange`（from/to）
- **WHEN** 用户点击 Apply
  - **THEN** 系统 MUST 校验当前选区文本 hash 是否仍匹配
  - **IF NOT** MUST 返回 `CONFLICT`（提示用户“内容已变化，请重试/重新运行技能”），不得 silent apply

### 5.3 失败语义（MUST）

- Apply 失败（任一原因）：
  - MUST 不写入 `documents`（SSOT 不得半成功）
  - MUST 不落 `actor=ai` 版本
  - MUST 返回 `IpcErr`（稳定错误码 + 可读 message）

---

## 6. 测试要求（必须写进实现任务卡）

- Unit：
  - `content_json → content_text` 的确定性（同输入同输出）
  - `content_json → content_md` 的确定性（同输入同输出；失败降级可测）
  - selection conflict 检测：hash 不匹配 → `CONFLICT`
- E2E（Windows）：
  - fake AI 输出 replacement text → diff 可见 → Apply → 编辑器内容变化 → 版本新增（actor=ai）

---

## Reference (WriteNow)

参考路径：

- `WriteNow/openspec/specs/api-contract/spec.md`（Envelope + error codes）
- `WriteNow/tests/e2e/app-launch.spec.ts`（启动→编辑→保存→重启→文件/DB/log 断言模式）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- “不丢稿”的可靠性必须通过 E2E + DB/日志证据强制门禁，而不是靠口头约定。
- 任何“写入 + 版本”都必须具备事务性，否则会产生不可恢复的数据漂移。

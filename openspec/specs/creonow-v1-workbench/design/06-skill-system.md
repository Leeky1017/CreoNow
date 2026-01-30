# 06 - Skill System（Package / Validator / context_rules / UI surface）

> 上游 Requirement：`CNWB-REQ-080`  
> 目标：定义 CN V1 的技能系统规范：包格式、校验器、作用域、注入规则与 UI 入口。

---

## 1. Skill 包格式（V1 固定）

### 1.1 包目录结构（建议）

```
apps/desktop/main/skills/
  packages/
    pkg.creonow.builtin/
      1.0.0/
        skills/
          polish/
            SKILL.md
          expand/
            SKILL.md
```

约束：

- 每个 skill 目录必须包含 `SKILL.md`。
- `SKILL.md` 必须由 YAML frontmatter + markdown body 组成。

### 1.2 Frontmatter schema（最小集合）

> 说明：字段可扩展，但 V1 必须至少覆盖以下字段语义，且校验器必须严格。

- `id`（string，建议：`builtin:<name>` / `global:<name>` / `project:<name>`）
- `name`（string）
- `description`（string，可选）
- `version`（string）
- `tags`（string[]，可选）
- `kind`（`single | chat`，可选）
- `scope`（`builtin | global | project`）
- `packageId`（string）
- `context_rules`（object，见 §2）
- `modelProfile`（object：tier/preferred 等，可选）
- `output`（object：format/constraints，可选）
- `prompt.system` / `prompt.user`（string，MUST）

Markdown body（正文）只用于人类阅读（Intent/示例），不得作为运行时依赖。

---

## 2. `context_rules` 固定键集合（V1 必须严格校验）

CN V1 仅允许以下键（未知键必须拒绝并返回 `INVALID_ARGUMENT`）：

- `surrounding: number`（字符数；选区前后文窗口）
- `user_preferences: boolean`
- `style_guide: boolean`
- `characters: boolean`
- `outline: boolean`
- `recent_summary: number`（最近摘要条数）
- `knowledge_graph: boolean`

约束：

- `surrounding` 必须为 `0..5000` 的整数（范围可调，但必须固定并可测）。
- `recent_summary` 必须为 `0..10` 的整数。

---

## 3. 作用域与优先级（MUST）

### 3.1 作用域

- `builtin`：随应用打包（不可删除，但可禁用）
- `global`：用户级（放在 `CREONOW_USER_DATA_DIR/skills/**`）
- `project`：项目级（放在 `<projectRoot>/.creonow/skills/**`）

### 3.2 优先级与覆盖（建议）

当出现同 `id` 冲突：

1. project 覆盖 global
2. global 覆盖 builtin

但必须保持“单链路”：最终只加载一个来源作为该 `id` 的 SSOT。

---

## 4. Validator（必须可诊断）

校验器必须输出：

- `valid: boolean`
- `error_code: IpcErrorCode`（通常 `INVALID_ARGUMENT`）
- `error_message: string`（可读，包含定位信息：缺字段/类型错误/未知键）

禁止 silent failure：任何解析/校验异常都必须可被 UI 展示并可恢复（例如允许用户修复后重新加载）。

---

## 5. IPC 通道（V1 必须）

- `skill:list({ includeDisabled?: boolean })`
- `skill:read({ id })`
- `skill:write({ id, content })`（global/project）
- `skill:toggle({ id, enabled })`

响应必须包含（至少）：

- `id/name/scope/enabled/valid`
- `error_code/error_message`（当 invalid）

---

## 6. UI Surface（必须可发现）

### 6.1 AI Panel Skills Popup

- 右侧 AI 面板提供技能选择入口（匹配设计稿 `14-ai-panel.html`）。
- 每个技能条目必须具备稳定选择器：`ai-skill-<skillId>`。

### 6.2 Command Palette

- `Cmd/Ctrl+P` 打开命令面板（见 `17-command-palette.html`）。
- 至少提供：
  - `Run Skill: <skill>`（运行）
  - `Toggle Skill: <skill>`（启停）
  - `Open Settings` / `Open Workbench`

---

## 7. 测试要求（必须）

- Unit：
  - frontmatter 解析（YAML）
  - context_rules 未知字段拒绝
  - 缺字段返回 `INVALID_ARGUMENT` 且包含 fieldName
- E2E（Windows）：
  - `skill:list` 至少返回一个 builtin skill（enabled+valid）
  - 禁用 skill 后：按钮不可点击或运行返回 `INVALID_ARGUMENT/UNSUPPORTED`（语义必须写死并可断言）

---

## Reference (WriteNow)

参考路径：

- `WriteNow/electron/skills/packages/pkg.writenow.builtin/1.0.0/skills/*/SKILL.md`（frontmatter 字段与 context_rules 形态）
- `WriteNow/electron/ipc/skills.cjs`（skill:list/toggle 的 IPC 语义）
- `WriteNow/tests/e2e/skill-system-v2-*.spec.ts`（skills 系统的可测模式；如存在）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- `context_rules` 必须“声明式 + 可审计 + 严格校验”，否则上下文注入会不可控且难以测试。
- skills 的 enabled/valid 状态必须进入 UI，可诊断错误必须可见（不能只写日志）。

# P0-010: Skills（package loader + validator + list/toggle + UI 入口）

Status: pending

## Goal

交付 CN 的 skills 系统最小可用：skill package 格式（`SKILL.md` frontmatter）、严格 validator（未知 `context_rules` 字段拒绝）、builtin/global/project 作用域与启停逻辑；并在 UI 提供 AI Panel skills popup + 命令面板入口。

## Dependencies

- Spec: `../spec.md#cnwb-req-080`
- Design: `../design/06-skill-system.md`
- Design: `../design/01-frontend-implementation.md`
- P0-002: `./P0-002-ipc-contract-ssot-and-codegen.md`
- P0-006: `./P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md`（run skill）

## Expected File Changes

| 操作   | 文件路径                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| Add    | `apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills/*/SKILL.md`（至少包含 `builtin:polish`） |
| Add    | `apps/desktop/main/src/services/skills/skillLoader.ts`（扫描 packages + 解析 frontmatter）                   |
| Add    | `apps/desktop/main/src/services/skills/skillValidator.ts`（严格校验 + error details）                        |
| Add    | `apps/desktop/main/src/ipc/skills.ts`（`skill:list/read/write/toggle`）                                      |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（skills 表字段：enabled/valid/error_code/error_message） |
| Add    | `apps/desktop/renderer/src/features/ai/SkillPicker.tsx`（skills popup；`data-testid="ai-skill-<id>"`）       |
| Add    | `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`（`data-testid="command-palette"`）    |
| Add    | `apps/desktop/tests/e2e/skills.spec.ts`                                                                      |
| Add    | `apps/desktop/tests/unit/skillValidator.test.ts`                                                             |

## Acceptance Criteria

- [ ] skill package：
  - [ ] `SKILL.md` 使用 YAML frontmatter + markdown body
  - [ ] 至少提供 1 个 builtin skill（推荐 `builtin:polish`）
- [ ] validator：
  - [ ] 缺字段/类型错误 → `INVALID_ARGUMENT`，且 `details` 包含 fieldName
  - [ ] `context_rules` 未知字段必须拒绝（硬禁）
- [ ] scopes：
  - [ ] builtin/global/project 三种 scope 的目录落点写死并实现
  - [ ] 同 id 冲突的覆盖规则写死（project > global > builtin），且最终只保留单事实源
- [ ] IPC：
  - [ ] `skill:list` 返回 `enabled/valid/error_*`
  - [ ] `skill:toggle` 生效且可持久化
- [ ] UI：
  - [ ] AI Panel skills popup 可打开并列出 skills
  - [ ] 选择 skill 后可触发 `ai:skill:run`
  - [ ] 命令面板 `Cmd/Ctrl+P` 可打开（最小可用）
- [ ] 禁用 skill：
  - [ ] UI 中该 skill 不可运行（禁用态或隐藏，但行为必须写死且可测）

## Tests

- [ ] Unit：`skillValidator.test.ts`
  - [ ] 未知 context_rules 字段拒绝
  - [ ] YAML 语法错误 → invalid + 可读 error_message
- [ ] E2E（Windows）`skills.spec.ts`
  - [ ] `skill:list` 返回至少 1 个 enabled+valid skill
  - [ ] 禁用该 skill → UI 不可运行或运行返回明确错误码（断言）

## Edge cases & Failure modes

- skill 文件编码/换行不一致 → parser 必须鲁棒（但校验必须严格）
- skill 内容含敏感信息 → 不得在日志中输出 full text（只记录 id/path）

## Observability

- `main.log` 必须记录：
  - `skill_loaded`（count）
  - `skill_invalid`（id + error_code）
  - `skill_toggled`（id + enabled）

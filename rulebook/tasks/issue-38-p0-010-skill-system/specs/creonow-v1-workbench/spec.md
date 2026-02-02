# Spec Delta: creonow-v1-workbench (ISSUE-38)

本任务实现 `P0-010`（Skill System MVP）：skill packages + strict validator + scopes + list/toggle + UI surface，并对禁用/无效 skill 提供可诊断、可断言的失败路径。

## Changes

- Add: builtin skill package `builtin:polish`（YAML frontmatter + markdown body），并在 build 产物中打包 builtin skills。
- Add: main skills loader（扫描 packages + frontmatter 解析）与 validator（严格 schema；`context_rules` 未知字段拒绝）。
- Add: scope 规则：builtin/global/project 三种落点与覆盖优先级（project > global > builtin），最终每个 `id` 仅保留单一 SSOT。
- Add: DB-backed skill state：`enabled/valid/error_code/error_message`，并提供 schema upgrade migration。
- Add: IPC `skill:list/read/write/toggle`（typed envelope；list 返回 enabled/valid/error\_\*）。
- Update: `ai:skill:run` 在 main 侧强制校验 enabled/valid，并将 skill prompts 注入 provider 请求。
- Add: renderer AI Panel skills popup（SkillPicker）；Cmd/Ctrl+P 命令面板可打开。
- Add: Unit + E2E 覆盖 validator 与 toggle/禁用态/command palette。

## Acceptance

- 满足 `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-010-skill-system-packages-validator-ui.md` 的 Acceptance Criteria。
- 满足 `CNWB-REQ-080` 的 Scenarios（invalid 可读错误；disabled 不可运行或明确提示）。

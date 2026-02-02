# Proposal: issue-38-p0-010-skill-system

## Why

交付 `P0-010` skills 系统最小可用：固定的 skill package 格式（`SKILL.md` YAML frontmatter + markdown body）、严格 validator（`context_rules` 未知字段必须拒绝）、可诊断的 enabled/valid/error\_\* 状态与 IPC/UI 入口。

## What Changes

- Add: builtin skills package（`apps/desktop/main/skills/packages/**`），内置 `builtin:polish`。
- Add: main skills services：package loader（扫描 + frontmatter 解析）、validator（严格 schema + error details）、DB-backed skill state（enabled/valid/error\_\*）。
- Add: IPC `skill:list/read/write/toggle`（typed, deterministic envelope）。
- Update: DB schema：skills 表新增 `valid/error_code/error_message`，并提供升级 migration。
- Update: AI run 在 main 侧强制校验 skill enabled/valid，并将 skill prompts 注入到 provider 请求（Fake-first 可测）。
- Add: renderer AI Panel skills popup（SkillPicker）+ 选择后可运行。
- Add: Unit + E2E 覆盖 validator 与 toggle/禁用态/command palette。

## Impact

- Affected specs: `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-080`；`openspec/specs/creonow-v1-workbench/task_cards/p0/P0-010-skill-system-packages-validator-ui.md`
- Affected code: `apps/desktop/main`（db/migrations/ipc/services）+ `apps/desktop/renderer`（AI Panel）
- Breaking change: NO（提供 DB 升级 migration；fresh DB 直接落新 schema）
- User benefit: skills 可发现、可启停、可诊断；禁用/无效技能不可运行且错误可断言。

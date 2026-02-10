## ADDED Requirements

### Requirement: Skill Panel Trigger And Scope Management MUST Be Deterministic

AI 面板中的 Skill 入口 MUST 支持按作用域分组展示、作用域覆盖解析、启停控制与作用域升降，并在选择后自动触发执行。

#### Scenario: Select Skill And Execute

- **Given** 用户已打开 AI 面板且存在可用技能
- **When** 用户在 Skill 面板点击可用技能
- **Then** 面板关闭并触发对应技能执行

#### Scenario: Empty Custom State

- **Given** 当前仅有 builtin 技能且无 global/project 自定义技能
- **When** 用户打开 Skill 面板
- **Then** 系统展示自定义技能空状态与创建入口

#### Scenario: Scope Override

- **Given** project 与 global 存在同名技能
- **When** 用户打开 Skill 面板并执行该技能
- **Then** project 版本生效并显示覆盖标识

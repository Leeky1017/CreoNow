# Editor Rulebook Delta

## Requirement: Editor P1 Bubble Menu and Outline Delivery [ADDED]

本任务必须完整交付 `editor-p1-bubble-menu-outline`，并保证交付链路可审计：

- 先完成 Dependency Sync Check，再进入 Red。
- Bubble Menu 与 Outline 的 Scenario 覆盖与 `openspec/changes/editor-p1-bubble-menu-outline/specs/editor-delta.md` 对齐。
- 测试执行遵循 Red → Green → Refactor，且有失败与通过证据。
- 交付完成后归档 OpenSpec change 与 Rulebook task，并收口至 `main`。

#### Scenario: Rulebook delivery chain remains auditable [ADDED]

- **GIVEN** 当前任务在 `task/400-editor-p1-bubble-menu-outline` 分支执行
- **WHEN** 完成开发、测试、门禁与 PR 合并
- **THEN** RUN_LOG 包含 Dependency Sync、Red/Green 与门禁证据
- **AND** `editor-p1-bubble-menu-outline` 与 `issue-400-editor-p1-bubble-menu-outline` 在同一交付链路中完成归档

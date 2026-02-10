# Editor Rulebook Delta

## Requirement: Editor P0 TipTap Foundation Toolbar Delivery [ADDED]

本任务必须完成 `editor-p0-tiptap-foundation-toolbar` 的全量交付闭环：

- Scenario→测试映射完整且先 Red 后 Green。
- TipTap 基础能力覆盖 Underline、工具栏状态、快捷键提示与粘贴清洗。
- `editorStore` bootstrap 与 autosave 状态机场景具备可执行测试证据。
- 完成 RUN_LOG、门禁验证、change 归档与 `main` 收口。

#### Scenario: Rulebook delivery chain remains auditable [ADDED]

- **GIVEN** 任务以 `task/393-editor-p0-tiptap-foundation-toolbar` 分支执行
- **WHEN** 完成交付并发起 PR
- **THEN** RUN_LOG 含 Dependency Sync、Red/Green 与门禁证据
- **AND** change 与 rulebook task 在合并后完成归档

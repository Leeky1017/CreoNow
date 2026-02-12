# Proposal: issue-423-editor-p4-a11y-hardening

## Why

`openspec/changes/editor-p4-a11y-hardening` 已定义 Editor 模块在可访问性、性能阈值、异常边界与容量/并发行为上的硬化要求。当前实现虽然具备 p0~p3 的核心能力，但仍缺少可验证的 p4 闭环：自动保存与手动保存竞态优先级、超大粘贴分块与超限确认、文档容量上限提示、以及重算任务取消证据。若不完成本 change，Editor 模块无法通过 p4 可验收标准。

## What Changes

- 按 TDD 交付 `editor-p4-a11y-hardening` 的 8 个场景（a11y / 冲突 / 竞态 / 容量 / 粘贴 / 重算取消 / 性能）。
- 在 editor 保存链路中引入统一写入队列，确保 `manual-save` 在竞态下优先且与 autosave 复用同一队列。
- 在编辑器侧补齐文档字符上限检测与状态栏提示，并实现超大粘贴分块处理与超限确认。
- 为大纲容器补充“快速输入只保留最后一次重算任务”可测证据（必要时最小实现增强）。
- 新增/扩展对应单元测试与性能基线测试，并完成 Red→Green→Refactor 证据。
- 完成 change / Rulebook / RUN_LOG 落盘，更新 `EXECUTION_ORDER.md`，归档并合并回 `main`。

## Impact

- Affected specs:
  - `openspec/changes/editor-p4-a11y-hardening/specs/editor-delta.md`
  - `openspec/changes/editor-p4-a11y-hardening/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
  - `apps/desktop/renderer/src/features/editor/InlineFormatButton.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.test.ts`
  - `apps/desktop/renderer/src/components/layout/StatusBar.tsx`
  - `apps/desktop/renderer/src/components/layout/StatusBar.test.tsx`
  - `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.tsx`
  - `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.test.tsx`
  - `apps/desktop/renderer/src/features/ai/applySelection.ts`
  - `apps/desktop/renderer/src/features/ai/applySelection.test.ts`
  - `apps/desktop/tests/perf/editor-p4-hardening.benchmark.test.ts`
- Breaking change: NO
- User benefit: 编辑器在键盘可达、容量边界、并发保存、AI 冲突阻断和性能门限下具备可判定、可恢复、可验证行为。

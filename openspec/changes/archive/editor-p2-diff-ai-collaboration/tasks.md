## 1. Specification

- [x] 1.1 审阅主 spec `editor/spec.md` 中「选中内容自动引用到 AI 对话输入框」的全部 Scenario（5 个）
- [x] 1.2 审阅主 spec `editor/spec.md` 中「AI 协作 Inline Diff」的全部 Scenario（4 个）
- [x] 1.3 审阅主 spec `editor/spec.md` 中「Diff 对比模式（多版本）」的全部 Scenario（3 个）
- [x] 1.4 审阅 selectionRef 的 sticky 行为与四种清除条件
- [x] 1.5 审阅 DiffViewPanel 逐块接受/拒绝与 compareMode 状态机
- [x] 1.6 审阅 MultiVersionCompare 布局规则（2×2 网格、3 版本跨列、syncScroll）
- [x] 1.7 依赖同步检查（Dependency Sync Check）：上游 `editor-p0` + AI Service（Phase 3）；核对 editorStore 接口、aiStore selectionText/selectionRef 字段、AI 流式响应 SkillResult 结构

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「Selection creates reference card in AI panel」→ `apps/desktop/renderer/src/features/ai/AiPanel.selection-reference.test.tsx`
- [x] 2.2 S「User manually dismisses reference」→ `apps/desktop/renderer/src/features/ai/AiPanel.selection-reference.test.tsx`
- [x] 2.3 S「Sending AI request with reference」→ `apps/desktop/renderer/src/features/ai/AiPanel.selection-reference.test.tsx`
- [x] 2.4 S「New selection replaces existing reference」→ `apps/desktop/renderer/src/features/ai/AiPanel.selection-reference.test.tsx`
- [x] 2.5 S「No reference card when no selection exists」→ `apps/desktop/renderer/src/features/ai/AiPanel.selection-reference.test.tsx`
- [x] 2.6 S「AI suggestion displayed as inline diff」→ `apps/desktop/renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx`
- [x] 2.7 S「User rejects AI suggestion」→ `apps/desktop/renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx`
- [x] 2.8 S「User accepts AI suggestion in bulk」→ `apps/desktop/renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx`
- [x] 2.9 S「User selectively accepts individual change hunks」→ `apps/desktop/renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx`
- [x] 2.10 S「Two-version comparison with navigation」→ `apps/desktop/renderer/src/features/diff/DiffViewPanel.test.tsx`
- [x] 2.11 S「Four-version simultaneous comparison」→ `apps/desktop/renderer/src/features/diff/MultiVersionCompare.test.tsx`
- [x] 2.12 S「Empty diff when versions are identical」→ `apps/desktop/renderer/src/features/diff/DiffViewPanel.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 编写选中引用（selectionRef / reference card）全部 Scenario 的失败测试
- [x] 3.2 编写 AI Inline Diff（DiffViewPanel / hunk 操作）全部 Scenario 的失败测试
- [x] 3.3 编写多版本对比（MultiVersionCompare / syncScroll）全部 Scenario 的失败测试
- [x] 3.4 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 captureSelectionRef + reference card 组件 + sticky/清除逻辑
- [x] 4.2 最小实现 DiffViewPanel（UnifiedDiffView / SplitDiffView / DiffStats / DiffFooter）
- [x] 4.3 最小实现逐块接受/拒绝 + 全部接受/拒绝 + compareMode 切换
- [x] 4.4 最小实现 MultiVersionCompare（2×2 网格、3 版本跨列、syncScroll）
- [x] 4.5 最小实现冲突检测 applySelection() → CONFLICT

## 5. Refactor（保持绿灯）

- [x] 5.1 抽象 DiffViewPanel 为独立可复用模块（供 version-control 引用）
- [x] 5.2 统一 Diff 着色为 design token 引用，消除硬编码色值
- [x] 5.3 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作

## 1. Specification

- [x] 1.1 审阅主 spec `version-control/spec.md` 中「AI 修改标记与区分显示」的全部 Scenario（2 个）
- [x] 1.2 审阅主 spec 中「版本预览」的全部 Scenario（2 个）
- [x] 1.3 审阅 `creonow.editor.showAiMarks` 偏好持久化方式
- [x] 1.4 审阅预览模式提示条样式与交互（只读、工具栏禁用、返回）
- [x] 1.5 依赖同步检查（Dependency Sync Check）：上游 `version-control-p0` + `editor-p0`；核对快照读取 IPC、编辑器只读模式 API、工具栏禁用机制

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「用户开启 AI 修改区分显示」→ `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.test.tsx` + `apps/desktop/renderer/src/stores/versionPreferencesStore.test.ts`
- [x] 2.2 S「默认模式不区分 AI 修改」→ `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.test.tsx`
- [x] 2.3 S「用户预览历史版本」→ `apps/desktop/renderer/src/stores/versionStore.test.ts` + `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx` + `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.4 S「用户从预览返回当前版本」→ `apps/desktop/renderer/src/stores/versionStore.test.ts` + `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 编写 AI 标记区分（开启/关闭/标签展示）的失败测试
- [x] 3.2 编写版本预览（只读切换/提示条/工具栏禁用/返回）的失败测试
- [x] 3.3 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 showAiMarks 偏好读取/持久化与条件渲染
- [x] 4.2 最小实现 AI 修改标签（`--color-info` 背景）在版本历史列表中的展示
- [x] 4.3 最小实现版本预览模式（只读 + 提示条 + 工具栏禁用）
- [x] 4.4 最小实现「返回当前版本」恢复可编辑状态

## 5. Refactor（保持绿灯）

- [x] 5.1 将预览模式状态管理收敛到 versionStore 单一状态机
- [x] 5.2 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作

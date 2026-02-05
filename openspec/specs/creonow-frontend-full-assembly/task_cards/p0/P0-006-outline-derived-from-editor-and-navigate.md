# P0-006: Outline（从编辑器派生 + 可导航）

Status: todo

## Goal

把 Sidebar → Outline 面板补齐为真实可用能力：

- 从当前文档（TipTap/ProseMirror）派生 Outline items（heading 结构）
- 点击 Outline 项能定位到编辑器对应位置（focus + selection/scroll）
- 禁止空数组占位与 `console.log`

## Assets in Scope（对应 Storybook Inventory）

- `Features/OutlinePanel`
-（组装点）`Layout/Sidebar`

## Dependencies

- Spec: `../spec.md#cnfa-req-005`
- Spec: `../spec.md#cnfa-req-003`
- Design: `../design/02-navigation-and-surface-registry.md`（稳定 testid）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/features/outline/deriveOutline.ts`（纯函数：从 ProseMirror doc 导出 items + positions） |
| Add | `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.tsx`（接 editorStore，提供 items/onNavigate） |
| Update | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`（使用 container，移除空数组与 console.log） |
| Add | `apps/desktop/renderer/src/features/outline/deriveOutline.test.ts`（边界测试） |
| Add | `apps/desktop/tests/e2e/outline-panel.spec.ts`（E2E 门禁） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：deriveOutline 纯函数 + unit（先把算法写死）
2. PR-B：container 接 editorStore（items/activeId/onNavigate）
3. PR-C：Sidebar 接入 container + E2E 门禁（移除占位 items/console.log）

## Conflict Notes（并行约束）

- `Sidebar.tsx` 与 P0-007/P0-008/P0-012 等任务有冲突风险：建议按 “container 下沉” 模式拆分（见 `design/09-parallel-execution-and-conflict-matrix.md`）。

## Acceptance Criteria

- [ ] Outline items：
  - [ ] 当文档包含 H1/H2/H3 时，Outline 显示对应层级结构
  - [ ] items 必须稳定（id 不随渲染变化；可用 position hash 或 nodeId）
  - [ ] 文档为空/无标题时显示明确空态（不是空白）
- [ ] 导航：
  - [ ] 点击 Outline 项后，编辑器聚焦并定位到对应 heading（selection 或 scroll）
  - [ ] 当前光标在某 heading 下时，Outline 能高亮当前段落所属 heading（activeId）
- [ ] 与 Editor 状态一致：
  - [ ] 切换文档后 Outline 立刻更新（不会显示旧文档大纲）
- [ ] 禁止占位：
  - [ ] 不再传 `items={[]}` 与 `console.log("Navigate...")`

## Tests

- [ ] Unit `deriveOutline.test.ts`：
  - [ ] 无 headings → 返回空数组
  - [ ] 多层 headings → level 正确
  - [ ] 超长标题/包含 emoji/中文 → 不崩溃且可渲染
  - [ ] 同标题重复 → id 仍唯一
- [ ] E2E `outline-panel.spec.ts`：
  - [ ] 创建文档 → 输入包含 headings 的内容
  - [ ] 打开 Outline → 断言 headings 可见
  - [ ] 点击某 heading → 断言编辑器已聚焦且 selection 位于该 heading 附近（可用 `page.evaluate` 读 editor state 或断言滚动位置变化）

## Edge cases & Failure modes

- 大文档（很多 headings）：
  - Outline 派生必须有性能边界（例如 debounce；不得卡死输入）
- heading 文本提取失败：
  - 必须降级为占位文本（例如 “(untitled heading)”），而不是崩溃

## Observability

- 发生异常时必须可观察（UI 错误提示或 error boundary），禁止 silent failure

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/OutlinePanel`：
  - [ ] 折叠/展开、hover/focus 正常
  - [ ] 点击交互符合预期（留证到 RUN_LOG；证据格式见 `../design/08-test-and-qa-matrix.md`）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

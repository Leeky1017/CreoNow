# P1-005: XSS 防护（移除或 sanitize `dangerouslySetInnerHTML`）

Status: todo

## Goal

消除审评指出的 XSS 风险点：禁止未处理的 `dangerouslySetInnerHTML`。

> 审评报告定位：`apps/desktop/renderer/src/features/editor/EditorToolbar.stories.tsx:51`

## Decision（写死路径，执行者不得自选）

选择路径 A（移除 innerHTML）：

- 改用 TipTap 的 `EditorContent` 进行安全渲染
- 不引入 DOMPurify 依赖（降低 native/依赖风险）

## Dependencies

- Spec: `../spec.md#cnmvp-req-007`
- Design: `../design/06-security-hardening.md`

## Expected File Changes

| 操作   | 文件路径                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/renderer/src/features/editor/EditorToolbar.stories.tsx`（替换 innerHTML → EditorContent）       |
| Add    | `apps/desktop/tests/unit/no-dangerouslySetInnerHTML.spec.ts`（静态门禁：renderer 生产代码不得出现 innerHTML） |
| Update | `package.json`（若需要把静态门禁纳入 `pnpm test:unit`）                                                       |

## Detailed Breakdown

1. 修改 `EditorToolbar.stories.tsx`
   - 引入 `EditorContent`（`@tiptap/react` 已有依赖）
   - 用 `<EditorContent editor={editor} />` 替代 `dangerouslySetInnerHTML`
2. 增加静态门禁（unit）
   - 新增一个 unit script：
     - 扫描 `apps/desktop/renderer/src`（排除 `**/*.stories.*` 可选，但本案例在 stories 也修掉）
     - 断言不存在 `dangerouslySetInnerHTML`
3. 运行并通过：`pnpm test:unit`

## Acceptance Criteria

- [ ] `dangerouslySetInnerHTML` 在该 story 中被移除
- [ ] unit 门禁确保不会再次引入未审计的 innerHTML

## Tests

- [ ] `pnpm test:unit`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

# P2-005: UI strings 常量化（停止扩散硬编码字符串）

Status: todo

## Goal

把高频/重复/易错的 UI 字符串收敛为常量，停止继续扩散硬编码文本，并为未来 i18n 预留结构。

## Dependencies

- Spec: `../spec.md#cnmvp-req-011`
- Design: `../design/10-code-quality-console-and-strings.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/lib/uiStrings.ts` |
| Update | `apps/desktop/renderer/src/**`（替换高频字符串） |
| Add | `apps/desktop/tests/unit/ui-strings-no-duplicates.spec.ts`（可选：防扩散门禁） |

## Detailed Breakdown

1. 新增 `uiStrings.ts`（按域分组导出）
2. 先替换最关键的对话框/错误文案：
   - SystemDialog 文案
   - Rename dialogs
   - 常见按钮：Cancel/Save/Delete/Restore
3. 可选静态门禁：限制新增硬编码（规则必须写死，避免误伤）

## Acceptance Criteria

- [ ] 新增 `uiStrings.ts` 并在关键对话框落地替换
- [ ] 不改变任何文案含义（只是搬迁）

## Tests

- [ ] `pnpm test:unit`（若有静态门禁）
- [ ] `pnpm -C apps/desktop test:run`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`


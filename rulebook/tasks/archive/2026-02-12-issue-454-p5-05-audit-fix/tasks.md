# Tasks for Issue #454

## 1. Specification

- [x] 审计 p5-05 交付质量，识别 7 项缺陷

## 2. TDD Mapping（先测前提）

- [x] S-system-theme → App.test.tsx
- [x] S-nfr → workbench-nfr.benchmark.test.ts
- [x] S-resizer-hover → Resizer.test.tsx
- [x] S-zod-command → CommandPalette.test.tsx
- [x] S-debounce-hook → useDebouncedCallback.test.ts

## 3. Red（先写失败测试）

- [x] App.test.tsx 8 条 matchMedia 测试
- [x] workbench-nfr.benchmark.test.ts 7 条 NFR 测试
- [x] Resizer.test.tsx 2 条 hover 样式测试
- [x] CommandPalette.test.tsx 5 条 zod 校验测试
- [x] useDebouncedCallback.test.ts 5 条 hook 测试

## 4. Green（最小实现通过）

- [x] CommandPalette.tsx commandItemSchema + validateCommandItems
- [x] useDebouncedCallback.ts 通用 hook
- [x] AppShell.tsx 重构使用 useDebouncedCallback
- [x] RightPanel.stories.tsx WithCollapseButton story

## 5. Refactor（保持绿灯）

- [x] 全量回归 115 files, 1372 tests, 0 failures

## 6. Evidence

- [x] RUN_LOG ISSUE-451 审计修复段落已记录
- [x] tasks.md 全部 checkbox 已更新
- [x] delta spec 新增 commandPalette zod scenario

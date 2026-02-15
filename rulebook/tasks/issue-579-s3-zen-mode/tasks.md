## 1. Implementation
- [x] 1.1 将 S3-ZEN-MODE-S1/S2/S3 映射为独立测试文件并先执行 RED
- [x] 1.2 最小实现修复快捷键重复触发：F11 忽略 `KeyboardEvent.repeat`

## 2. Testing
- [x] 2.1 运行聚焦 zen-mode 场景测试（RED）：`pnpm -C apps/desktop exec vitest run renderer/src/features/zen-mode/__tests__/zen-mode-enter.test.tsx renderer/src/features/zen-mode/__tests__/zen-mode-exit-restore.test.tsx renderer/src/features/zen-mode/__tests__/zen-mode-shortcut.test.tsx`
- [x] 2.2 运行聚焦 zen-mode 场景测试（GREEN）：同上命令，3/3 通过
- [x] 2.3 运行受影响 renderer 回归：`pnpm -C apps/desktop exec vitest run renderer/src/components/layout/AppShell.test.tsx renderer/src/stores/layoutStore.test.ts renderer/src/features/zen-mode/ZenMode.test.tsx`

## 3. Documentation
- [x] 3.1 更新 `openspec/changes/s3-zen-mode/tasks.md` 勾选状态（保留 main-session-audit 待 lead）
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-579.md`，记录依赖同步检查、RED/GREEN 与回归测试证据
- [x] 3.3 回填本 Rulebook `proposal.md` / `tasks.md` 为可审计实况

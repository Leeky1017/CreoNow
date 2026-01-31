## 1. Implementation

- [x] 1.1 新增 tokens/fonts/globals 样式并在 renderer 注入（深色主题）
- [x] 1.2 实现 AppShell + Resizer（clamp + 双击复位）+ data-testid

## 2. Testing

- [x] 2.1 E2E：拖拽 clamp、双击复位、重启持久化
- [x] 2.2 本地：`pnpm -C apps/desktop test:e2e`
- [ ] 2.3 CI：windows-e2e/windows-build 全绿

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-19.md` 并持续追加 Runs（只追加不回写）
- [x] 3.2 Rulebook task：补齐 spec delta 并保持 validate 通过

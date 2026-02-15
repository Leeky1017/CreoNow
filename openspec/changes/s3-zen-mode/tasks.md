## 1. Specification

- [ ] 1.1 审阅并确认 `s3-zen-mode` 边界：仅实现禅模式显隐与布局恢复，不扩展编辑器功能。
- [ ] 1.2 审阅并确认进入/退出禅模式的状态切换与快捷键约束。
- [ ] 1.3 审阅并确认验收阈值：进入可隐藏干扰项、退出可恢复原布局。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，标注 `N/A`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [ ] S3-ZEN-MODE-S1 `进入禅模式时隐藏侧栏并聚焦编辑器 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/features/zen-mode/__tests__/zen-mode-enter.test.tsx`
  - 测试名：`"entering zen mode hides side panels and keeps editor focus"`
- [ ] S3-ZEN-MODE-S2 `退出禅模式后恢复进入前布局状态 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/features/zen-mode/__tests__/zen-mode-exit-restore.test.tsx`
  - 测试名：`"exiting zen mode restores previous layout snapshot"`
- [ ] S3-ZEN-MODE-S3 `快捷键切换遵循现有布局状态契约 [MODIFIED]`
  - 测试文件：`apps/desktop/renderer/src/features/zen-mode/__tests__/zen-mode-shortcut.test.tsx`
  - 测试名：`"keyboard toggle keeps layout store in sync"`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S3-ZEN-MODE-S1 失败测试，确认进入态未形成完整隐藏行为。
- [ ] 3.2 编写 S3-ZEN-MODE-S2 失败测试，确认退出后恢复约束不满足。
- [ ] 3.3 编写 S3-ZEN-MODE-S3 失败测试，确认快捷键路径与状态同步尚未收敛。

## 4. Green（最小实现通过）

- [ ] 4.1 实现进入禅模式最小行为（隐藏侧栏/面板并聚焦编辑区）。
- [ ] 4.2 实现退出禅模式恢复逻辑（恢复进入前布局快照）。
- [ ] 4.3 接入快捷键触发并保证三条 Red 用例转绿。

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛禅模式状态与 layout store 交互，避免并行状态源。
- [ ] 5.2 清理重复切换逻辑，保持进入/退出路径可读且可测试。

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

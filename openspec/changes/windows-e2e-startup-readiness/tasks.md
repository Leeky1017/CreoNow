## 1. Specification

- [x] 1.1 限定本 change 仅覆盖 2 个 requirement：`项目创建` 与 `命令面板` 的 Windows E2E 就绪稳定性
- [x] 1.2 确认仅通过 delta spec 表达变更，不修改任何主 spec
- [x] 1.3 明确 out-of-scope：不修改业务语义与产品能力范围

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 每个 Scenario 映射到至少一个失败测试
- [x] 2.2 建立 Scenario ID → 测试文件/用例映射，保证可追踪
- [x] 2.3 设定门禁：未记录 Red 失败证据不得进入 Green
- [x] 2.4 未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] PM-WIN-S1 `创建项目后进入可编辑状态具备可等待就绪信号 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/e2e/ai-apply.spec.ts`
  - 目标测试：`apps/desktop/tests/e2e/version-history.spec.ts`
  - 目标测试：`apps/desktop/tests/e2e/documents-filetree.spec.ts`
  - 用例：创建项目后通过共享 helper 等待 `editor-pane + tiptap-editor` 就绪
- [x] PM-WIN-S2 `E2E 创建流程使用条件等待而非固定 sleep [ADDED]`
  - 目标测试：`apps/desktop/tests/e2e/_helpers/projectReadiness.ts`（新增）
  - 用例：`waitForEditorReady` 仅基于可观察状态（dialog 关闭、editor 可见、documentId 可用）
- [x] WB-WIN-S1 `命令执行后焦点落在目标对话框且命令面板已关闭 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/e2e/command-palette.spec.ts`
  - 用例：`Settings`/`Export` 路径在继续交互前显式断言命令面板关闭
- [x] WB-WIN-S2 `快捷键用例间无残留弹窗状态 [ADDED]`
  - 目标测试：`apps/desktop/tests/e2e/command-palette.spec.ts`
  - 用例：每个测试开始前执行弹窗清理并断言 `settings/export/create-project` 均关闭

## 3. Red（先写失败测试）

- [x] 3.1 在共享 helper 引入前，记录 Windows 失败证据（`tiptap-editor` 不可见 + `Search commands` fill 超时）
- [x] 3.2 针对 PM-WIN-S1/PM-WIN-S2 先编写或调整失败测试，证明现有等待策略不稳
- [x] 3.3 针对 WB-WIN-S1/WB-WIN-S2 先编写或调整失败测试，证明残留弹窗会污染后续用例
- [x] 3.4 Red 证据写入 `openspec/_ops/task_runs/ISSUE-273.md`

## 4. Green（最小实现通过）

- [x] 4.1 新增最小共享 helper，统一创建项目后的条件等待
- [x] 4.2 将失败集中的 E2E 用例迁移到共享 helper，去除脆弱等待点
- [x] 4.3 调整命令面板用例隔离策略，确保无弹窗残留
- [x] 4.4 执行最小验证集并记录 Green 证据

## 5. Refactor（保持绿灯）

- [x] 5.1 合并重复创建项目逻辑，减少跨文件重复步骤
- [x] 5.2 保持行为不变前提下整理测试可读性并持续绿灯

## 6. Evidence

- [x] 6.1 RUN_LOG 记录完整（Issue/PR/关键命令输入输出/失败与修复轨迹）
- [x] 6.2 记录规则校验：`rulebook task validate issue-273-windows-e2e-startup-readiness`
- [ ] 6.3 记录门禁状态：`ci`、`openspec-log-guard`、`merge-serial`

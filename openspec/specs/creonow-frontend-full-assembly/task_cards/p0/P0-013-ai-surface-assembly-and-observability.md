# P0-013: AI Surface 组装与可观测性（消除占位交互）

Status: todo

## Goal

把 AI Surface（`Features/AiPanel` + `Features/SkillPicker`）补齐到“真实可用、可观察、可测试”的状态：

- 消除 `TODO`/`console.log` 占位交互（History / New Chat / Skill settings）
- 保持并强化现有 E2E 选择器稳定（避免“测试全挂但不知道哪里坏了”）
- 错误路径可观察（UI 显示 `error.code: error.message`，且可 dismiss）

> 注：当前仓库不存在 `Features/ContextViewer` 与其 E2E；本卡以现有资产为准，不引入该孤儿假设。

## Assets in Scope（对应 Storybook Inventory）

- `Features/AiPanel`
- `Features/SkillPicker`
-（间接影响）`Layout/RightPanel`（AI tab 容器）

## Dependencies

- Spec: `../spec.md#cnfa-req-003`（所有可点击交互必须“接电”）
- Spec: `../spec.md#cnfa-req-012`（验收门禁 + 留证）
- Design: `../design/08-test-and-qa-matrix.md`（tests/storybook/证据格式）
- Design: `../design/09-parallel-execution-and-conflict-matrix.md`（并行冲突提示）
- P0-003: `./P0-003-settingsdialog-as-single-settings-surface.md`（Skill settings 入口必须对齐 SettingsDialog）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（New Chat/History 行为写死；移除 console.log/TODO；稳定 testid） |
| Update | `apps/desktop/renderer/src/features/ai/ChatHistory.tsx`（选择 chat 行为可判定：加载/切换/禁用态） |
| Update | `apps/desktop/renderer/src/features/ai/SkillPicker.tsx`（onOpenSettings 不再 console.log；打开 SettingsDialog） |
| Update | `apps/desktop/tests/e2e/ai-runtime.spec.ts`（必要的回归/选择器稳定性断言） |
| Update | `apps/desktop/tests/e2e/skills.spec.ts`（新增：从 SkillPicker 打开 SettingsDialog 的门禁） |
| Add (optional) | `apps/desktop/tests/e2e/ai-history.spec.ts`（若 History/New Chat 引入新 UI 断言点） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：New Chat 最小语义 + 选择器稳定
   - New Chat：清空当前对话并聚焦输入框（可测）
   - 保持 `ai-runtime.spec.ts`/`skills.spec.ts` 断言稳定（必要时同步）
2. PR-B：History 最小闭环
   - History dropdown 可打开/关闭
   - 选择一条历史会切换对话（或显示明确“Coming soon”并禁用入口）
3. PR-C：Skill settings 入口对齐 SettingsDialog
   - 点击 settings 打开 SettingsDialog（可指定 tab/section）
   - 禁止出现第二套 settings surface

## Acceptance Criteria

- [ ] 无占位交互（MUST）：
  - [ ] History：点击不再 `console.log`；具备可判定行为（切换/禁用 + 文案）
  - [ ] New Chat：点击具备可判定行为（清空对话 + 聚焦输入）
  - [ ] Skill settings：点击打开 SettingsDialog（不再 `console.log`）
- [ ] 错误可观察（MUST）：
  - [ ] AI 运行失败时 UI 显示 `error.code: error.message`（并可 dismiss）
- [ ] E2E 门禁（MUST）：
  - [ ] `ai-runtime.spec.ts` 仍能覆盖 success/timeout/upstream/cancel
  - [ ] `skills.spec.ts` 断言 “从 SkillPicker 打开 SettingsDialog”
- [ ] Storybook WSL-IP（MUST）：
  - [ ] 通过 Windows 浏览器经 WSL-IP 抽查 `Features/AiPanel` + `Features/SkillPicker`（证据格式见 Design 08）

## Tests

- [ ] E2E: `apps/desktop/tests/e2e/ai-runtime.spec.ts`（回归 + 选择器稳定）
- [ ] E2E: `apps/desktop/tests/e2e/skills.spec.ts`（新增：open settings）
- [ ]（可选）E2E: `apps/desktop/tests/e2e/ai-history.spec.ts`

## Edge cases & Failure modes

- 无可用 skill：
  - SkillPicker 必须显示明确空态（不可崩溃）
- history 列表为空：
  - History dropdown 必须显示空态（而不是空白）

## Observability

- renderer 禁止 `catch {}` 吞错；错误必须进入 UI
- 关键行为（new_chat / chat_selected）建议写入 renderer log（不含敏感信息）

## Manual QA (Storybook WSL-IP)

- [ ] `Features/AiPanel`：History/New Chat/错误态/焦点
- [ ] `Features/SkillPicker`：打开/关闭、选择、settings 入口

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

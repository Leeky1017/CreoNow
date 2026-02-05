# P0-010: RightPanel（Info/Quality 真接电：stats + judge/constraints）

Status: todo

## Goal

把 RightPanel 的 Info/Quality 从占位状态补齐为真实可用信息面板：

- Info：显示当前文档与写作统计（至少 word count + 今日 stats）
- Quality：接入 `judge:model:*` 与 `constraints:*`，展示真实状态与失败语义

## Dependencies

- Spec: `../spec.md#cnfa-req-011`
- Spec: `../spec.md#cnfa-req-003`
- Design: `../design/03-ipc-reservations.md`
- P0-003: `./P0-003-settingsdialog-as-single-settings-surface.md`（Judge/Proxy 设置入口统一）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/components/layout/RightPanel.tsx`（移除占位：InfoPanelContent/空 checkGroups） |
| Add | `apps/desktop/renderer/src/features/rightpanel/InfoPanel.tsx`（新增：真实信息面板） |
| Add | `apps/desktop/renderer/src/features/rightpanel/QualityPanel.tsx`（新增：包装 QualityGatesPanelContent，接 IPC） |
| Add | `apps/desktop/tests/e2e/rightpanel-info-quality.spec.ts`（新增门禁） |

## Acceptance Criteria

- [ ] Info 面板（最小闭环）：
  - [ ] 显示当前文档的基础信息（标题/更新时间/字数至少一项）
  - [ ] 显示今日写作 stats（来自 `stats:getToday`）
  - [ ] 无项目/无文档时显示清晰空态（不崩溃）
- [ ] Quality 面板（最小闭环）：
  - [ ] 展示 judge model 状态（来自 `judge:model:getState`）
  - [ ] 展示 constraints 条数（来自 `constraints:get`）
  - [ ] 失败/超时/不可用时必须可观察（UI 显示 `code: message`）
  - [ ] “Run all checks” 至少触发一次刷新（重新拉取 judge/constraints）
- [ ] 禁止占位：
  - [ ] 不再传 `checkGroups={[]}` 的“假通过”状态作为默认渲染

## Tests

- [ ] E2E `rightpanel-info-quality.spec.ts`：
  - [ ] 打开 Info tab → 断言至少一个真实字段可见（如 word count 或 stats）
  - [ ] 打开 Quality tab → 断言 judge 状态可见
  - [ ] 触发 ensure/refresh（或 Run all checks）→ UI 状态更新

## Edge cases & Failure modes

- stats IPC 不可用：
  - Info 面板必须降级显示（仍可用其他字段），并提示错误原因
- judge ensure 需要下载：
  - UI 必须呈现 running/downloading 状态（不可“卡住无反馈”）

## Observability

- UI 错误提示必须可断言（`data-testid`）
- main.log 侧已有 judge 日志与错误映射；若缺失需补齐

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Layout/RightPanel` 与 `Features/QualityGatesPanel`：
  - [ ] tab 切换、滚动、状态色彩符合 tokens（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`


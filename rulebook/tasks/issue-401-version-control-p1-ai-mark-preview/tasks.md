## 1. Specification
- [x] 1.1 审阅主 spec `openspec/specs/version-control/spec.md` 的「AI 修改标记与区分显示」「版本预览」4 个 Scenario
- [x] 1.2 审阅 `openspec/changes/archive/version-control-p1-ai-mark-preview/{proposal,tasks,specs/version-control-delta.md}`
- [x] 1.3 完成 Dependency Sync Check（`version-control-p0` + `editor-p0`）并记录 `NO_DRIFT/DRIFT`

## 2. TDD Mapping（先测前提）
- [x] 2.1 S1 用户开启 AI 区分显示 → 测试映射
- [x] 2.2 S2 默认不区分 AI 修改 → 测试映射
- [x] 2.3 S3 用户预览历史版本 → 测试映射
- [x] 2.4 S4 用户从预览返回当前版本 → 测试映射
- [x] 2.5 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）
- [x] 3.1 新增 AI 标记偏好与标签渲染失败测试
- [x] 3.2 新增历史版本预览状态机失败测试
- [x] 3.3 新增编辑器预览只读/工具栏禁用/返回当前版本失败测试
- [x] 3.4 RUN_LOG 记录 Red 命令与失败输出

## 4. Green（最小实现通过）
- [x] 4.1 实现 `creonow.editor.showAiMarks` 持久化与设置入口
- [x] 4.2 实现历史列表 AI 标签条件渲染（`--color-info` 背景）
- [x] 4.3 实现预览状态机并切换主编辑区为只读预览
- [x] 4.4 实现预览提示条、工具栏禁用、返回当前版本

## 5. Refactor（保持绿灯）
- [x] 5.1 预览状态收敛到 versionStore 单一状态机
- [x] 5.2 回归 type/lint/contract/cross-module/unit 保持全绿

## 6. Evidence
- [x] 6.1 维护 `openspec/_ops/task_runs/ISSUE-401.md`（含 Dependency Sync、Red/Green 证据）
- [ ] 6.2 记录 preflight、required checks、PR auto-merge、main 收口、worktree cleanup

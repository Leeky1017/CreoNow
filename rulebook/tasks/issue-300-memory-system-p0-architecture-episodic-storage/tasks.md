## 1. Implementation

- [x] 1.1 任务准入：创建 OPEN Issue #300、创建 task/worktree、确认 Owner 审批通过
- [x] 1.2 Rulebook task 初始化并通过 validate
- [x] 1.3 落地工作记忆结构、情景记忆 schema、隐式反馈函数、IPC record/query、调度触发接口
- [x] 1.4 完成容量淘汰/异常处理（写失败重试、容量溢出保护）

## 2. Testing

- [x] 2.1 按 MS1 场景建立 10 个测试文件并完成 Red 失败证据
- [x] 2.2 使全部场景测试 Green，并补充必要回归测试
- [x] 2.3 运行 typecheck/contract/test 门禁并记录结果

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-300.md`（Scenario 映射 + Red/Green + 命令证据）
- [x] 3.2 更新 change 任务状态并在完成后归档到 `openspec/changes/archive/`
- [ ] 3.3 PR auto-merge + 控制面 main 收口 + Rulebook task archive

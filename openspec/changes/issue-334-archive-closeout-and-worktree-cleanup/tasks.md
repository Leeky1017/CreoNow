## 1. Specification

- [x] 1.1 审阅并确认收口边界：仅归档与治理收口，不改运行时代码
- [x] 1.2 审阅并确认异常路径：归档失败需记录并阻断“已收口”声明
- [x] 1.3 审阅并确认验收阈值：preflight 通过 + active change 收敛
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 依赖 326/328/330/332 已合并状态，核对无漂移

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试/检查项
- [x] 2.2 为每个检查项标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：preflight 未通过不得进入交付

### Scenario → Test/Check 映射

- [x] S1 `已合并 change 被归档 [ADDED]`
  - 检查：`ls openspec/changes` 中 326/328/330/332 不再位于活跃目录
- [x] S2 `Rulebook task 与 change 保持同态归档 [ADDED]`
  - 检查：`rulebook task list` 不再显示 326/328/330/332 为 active

## 3. Red（先写失败测试）

- [x] 3.1 记录当前活跃目录包含 326/328/330/332（未归档）
- [x] 3.2 记录当前 Rulebook task 列表仍包含 326/328/330/332 active
- [x] 3.3 记录当前多 worktree 未清理状态

## 4. Green（最小实现通过）

- [x] 4.1 执行 change 归档、Rulebook 归档与 EXECUTION_ORDER 更新
- [x] 4.2 运行 preflight 与关键检查命令转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 去除冗余活跃清单条目，保持执行面最小活跃集
- [x] 5.2 保持单链路收口（不保留并行未归档副本）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含归档命令与验证输出）
- [x] 6.2 记录 Dependency Sync Check 核对结果
- [ ] 6.3 等待 PR required checks 全绿并 auto-merge 后确认 main 收口

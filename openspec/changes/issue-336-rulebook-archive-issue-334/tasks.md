## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅治理收口与任务归档，不改运行时代码
- [x] 1.2 审阅并确认错误路径：归档失败必须阻断“已收口”声明
- [x] 1.3 审阅并确认验收阈值：Rulebook validate 通过 + 归档路径正确 + PR 合并
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 依赖 `issue-334` 合并产物，核对无漂移

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试/检查项
- [x] 2.2 为每个检查项标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：归档前必须先看到 Red（active 状态），再进入实现

### Scenario → Test/Check 映射

- [x] S1 `已合并任务进入归档 [ADDED]`
  - 检查：归档前 `rulebook/tasks/issue-334-*` 存在，归档后不存在且出现在 `rulebook/tasks/archive/`
- [x] S2 `收口证据可追溯 [ADDED]`
  - 检查：`ISSUE-336` RUN_LOG 记录依赖同步、归档命令和 PR 链接

## 3. Red（先写失败测试）

- [x] 3.1 记录 `issue-334` task 在 active 目录仍存在（未归档）
- [x] 3.2 记录归档目录中不存在 `issue-334` 当日归档条目（命令 exit code=1）
- [x] 3.3 以“active 存在 + archive 缺失”作为进入 Green 的失败前提

## 4. Green（最小实现通过）

- [x] 4.1 执行 `rulebook task archive issue-334-archive-closeout-and-worktree-cleanup`
- [x] 4.2 更新 `EXECUTION_ORDER.md` 与 RUN_LOG 并通过 validate/preflight

## 5. Refactor（保持绿灯）

- [x] 5.1 保持单链路治理收口，不保留并行 active 副本
- [x] 5.2 精简文档到最小必要证据，避免重复记录

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 等待 PR required checks 全绿并 auto-merge 后确认 main 收口

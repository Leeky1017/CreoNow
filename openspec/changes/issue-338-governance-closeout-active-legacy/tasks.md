## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅治理收口与归档，不改运行时代码
- [x] 1.2 审阅并确认错误路径：任一归档失败必须阻断“已收口”声明
- [x] 1.3 审阅并确认验收阈值：归档路径正确 + Rulebook validate 通过 + preflight 通过
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 依赖 `issue-334`/`issue-336` 已合并状态，核对无漂移

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试/检查项
- [x] 2.2 为每个检查项标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败检查证据）不得进入实现

### Scenario → Test/Check 映射

- [x] S1 `已合并 active change 必须进入归档 [ADDED]`
  - 检查：`openspec/changes/` 不再包含 `issue-334`、`issue-336` active 目录
- [x] S2 `关闭 issue 的遗留 active task 必须归档 [ADDED]`
  - 检查：`rulebook/tasks/` 不再包含 `issue-39`、`issue-50` active 目录
- [x] S3 `执行面状态与活跃集合一致 [ADDED]`
  - 检查：`EXECUTION_ORDER.md` 与当前 active changes 集合一致

## 3. Red（先写失败测试）

- [x] 3.1 记录 `openspec/changes/` 中仍存在 `issue-334`/`issue-336` active 目录
- [x] 3.2 记录 `rulebook/tasks/` 中仍存在 `issue-39`/`issue-50` active 目录
- [x] 3.3 记录 `EXECUTION_ORDER.md` 仍描述旧执行状态（`issue-336` 进行中）

## 4. Green（最小实现通过）

- [x] 4.1 执行 OpenSpec change 归档与 Rulebook task 归档命令
- [x] 4.2 更新 `EXECUTION_ORDER.md` 与 `ISSUE-338` RUN_LOG，并通过 validate/preflight

## 5. Refactor（保持绿灯）

- [x] 5.1 保持单链路治理收口，不保留并行 active 副本
- [x] 5.2 精简执行顺序文档到当前最小必要活跃集

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 等待 PR required checks 全绿并 auto-merge 后确认 main 收口

## 1. Specification

- [x] 1.1 审阅并确认 `s2-slash-framework` 的范围仅包含 Slash 扩展框架与命令面板 UI。
- [x] 1.2 审阅并确认 `specs/editor-delta.md` 中触发、过滤、关闭场景与路线图 Scope 一致。
- [x] 1.3 审阅并确认边界：不包含具体命令注册与技能执行语义。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录 `NO_DRIFT` 结论。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 `editor-delta` 中每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

## 3. Red（先写失败测试）

- [x] 3.1 编写“输入 `/` 后面板出现”的失败测试并确认先失败。
- [x] 3.2 编写“面板搜索过滤列表”的失败测试并确认先失败。
- [x] 3.3 编写“关闭操作收起面板”的失败测试并确认先失败。

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Slash 触发与面板渲染相关测试转绿的最小代码。
- [x] 4.2 仅实现列表过滤与关闭交互所需最小逻辑，不引入命令执行语义。

## 5. Refactor（保持绿灯）

- [x] 5.1 清理扩展层与面板层重复状态处理，保持契约清晰。
- [x] 5.2 在不改变外部行为的前提下收敛可复用类型与事件接口。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 命令、失败与通过证据（见 `openspec/_ops/task_runs/ISSUE-546.md`）。
- [x] 6.2 记录 Dependency Sync Check 输入、核对项与 `NO_DRIFT` 结论。
- [x] 6.3 记录 Main Session Audit 结果并确认签字提交仅变更当前任务 RUN_LOG（见 `openspec/_ops/task_runs/ISSUE-546.md`）。

### 依赖同步检查（Dependency Sync Check）

- Inputs:
  - `docs/plans/unified-roadmap.md`（AR-C18 `s2-slash-framework` 条目与依赖图）
  - `openspec/changes/EXECUTION_ORDER.md`（Wave3 排序与 `s2-slash-commands` 下游依赖）
  - `openspec/changes/s2-slash-framework/proposal.md`
  - `openspec/changes/s2-slash-framework/specs/editor-delta.md`
- Checks:
  - Scope 仅覆盖 Slash 扩展框架 + 命令面板 UI。
  - 覆盖触发、过滤（含空结果态）、关闭后恢复普通输入 3 个场景。
  - 不提前实现具体命令注册/执行语义，与 `s2-slash-commands` 职责不重叠。
- Result: `NO_DRIFT`

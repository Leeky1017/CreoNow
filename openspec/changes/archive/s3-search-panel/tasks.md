## 1. Specification

- [x] 1.1 审阅并确认 `s3-search-panel` 边界：仅完善搜索面板 UI 与跳转闭环，不改检索算法。
- [x] 1.2 审阅并确认结果点击跳转、空态、错误态与加载态约束。
- [x] 1.3 审阅并确认验收阈值：查询可用、结果可跳转、异常可见。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，标注 `N/A`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [x] S3-SEARCH-PANEL-S1 `输入查询后展示结果列表 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/features/search/__tests__/search-panel-query.test.tsx`
  - 测试名：`"shows full-text hits after query input"`
- [x] S3-SEARCH-PANEL-S2 `点击结果后跳转到目标文档位置 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/features/search/__tests__/search-panel-navigation.test.tsx`
  - 测试名：`"navigates editor to selected search hit"`
- [x] S3-SEARCH-PANEL-S3 `空结果与错误态可区分显示 [MODIFIED]`
  - 测试文件：`apps/desktop/renderer/src/features/search/__tests__/search-panel-status.test.tsx`
  - 测试名：`"renders distinct empty and error states"`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-SEARCH-PANEL-S1 失败测试，确认当前查询链路不完整。
- [x] 3.2 编写 S3-SEARCH-PANEL-S2 失败测试，确认点击结果后未形成稳定跳转闭环。
- [x] 3.3 编写 S3-SEARCH-PANEL-S3 失败测试，确认空态/错误态呈现尚不满足要求。

## 4. Green（最小实现通过）

- [x] 4.1 完善 SearchPanel 查询输入与结果渲染最小实现。
- [x] 4.2 打通结果点击与编辑区跳转动作。
- [x] 4.3 补齐空态、错误态、加载态并使 Red 用例转绿。

## 5. Refactor（保持绿灯）

- [x] 5.1 统一 SearchPanel 状态机与渲染分支，减少重复分支逻辑。
- [x] 5.2 复核 Workbench 模式一致性，避免局部引入新风格状态实现。

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

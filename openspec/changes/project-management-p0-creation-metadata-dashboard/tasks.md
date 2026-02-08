## 1. Specification

- [ ] 1.1 审阅并确认 PM-1 仅覆盖创建、元数据、Dashboard 三个 requirement
- [ ] 1.2 审阅并确认跨切场景仅纳入容量溢出与非法枚举值
- [ ] 1.3 审阅并确认通道命名、Zod 契约、Storybook 覆盖与 out-of-scope

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] PM1-S1 用户手动创建项目
  - 目标测试：`apps/desktop/tests/unit/projectService.create.test.ts`
  - 用例：`should create project and default chapter when valid manual input`
- [ ] PM1-S2 用户通过 AI 辅助创建项目（Mock）
  - 目标测试：`apps/desktop/tests/unit/projectService.ai-assist.test.ts`
  - 用例：`should build project draft from ai-service mock response`
- [ ] PM1-S3 AI 辅助创建失败时降级到手动创建
  - 目标测试：`apps/desktop/renderer/src/features/projects/CreateProjectDialog.test.tsx`
  - 用例：`should show fallback message and keep manual mode available`
- [ ] PM1-S4 用户编辑项目元数据并保留占位字段
  - 目标测试：`apps/desktop/tests/unit/projectService.update.test.ts`
  - 用例：`should persist metadata changes without KG/Skill service calls`
- [ ] PM1-S5 用户切换创作阶段并同步展示
  - 目标测试：`apps/desktop/tests/unit/projectService.stage.test.ts`
  - 用例：`should persist stage transition and expose dashboard tag update`
- [ ] PM1-S6 用户在 Dashboard 打开项目
  - 目标测试：`apps/desktop/renderer/src/features/dashboard/Dashboard.open-project.test.tsx`
  - 用例：`should open selected project card and navigate to editor layout`
- [ ] PM1-S7 Dashboard 空状态引导新用户创建项目
  - 目标测试：`apps/desktop/renderer/src/features/dashboard/Dashboard.empty-state.test.tsx`
  - 用例：`should render empty state illustration and primary create CTA`
- [ ] PM1-S8 Dashboard 按名称搜索过滤
  - 目标测试：`apps/desktop/renderer/src/features/dashboard/Dashboard.search.test.tsx`
  - 用例：`should filter cards by project name and show no-result copy`
- [ ] PM1-S9 项目数量超过 2,000 时创建被阻断
  - 目标测试：`apps/desktop/tests/unit/projectService.capacity.test.ts`
  - 用例：`should return PROJECT_CAPACITY_EXCEEDED when project count limit reached`
- [ ] PM1-S10 元数据非法枚举值被拒绝
  - 目标测试：`apps/desktop/tests/unit/projectIpc.validation.test.ts`
  - 用例：`should reject invalid enum payload with PROJECT_METADATA_INVALID_ENUM`
- [ ] PM1-S11 IPC 输入非法时返回结构化错误
  - 目标测试：`apps/desktop/tests/unit/projectIpc.validation.test.ts`
  - 用例：`should return PROJECT_IPC_SCHEMA_INVALID with traceId`

## 3. Red（先写失败测试）

- [ ] 3.1 先为 PM1-S1~PM1-S5 编写失败测试并确认 Red（创建与元数据）
- [ ] 3.2 再为 PM1-S6~PM1-S8 编写失败测试并确认 Red（Dashboard 与打开流程）
- [ ] 3.3 最后为 PM1-S9~PM1-S11 编写失败测试并确认 Red（容量/枚举/schema）
- [ ] 3.4 将 Red 失败日志与命令输出记录到 `openspec/_ops/task_runs/ISSUE-291.md`

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 PM1-S1~PM1-S5 通过的最小代码
- [ ] 4.2 仅实现让 PM1-S6~PM1-S8 通过的最小代码
- [ ] 4.3 仅实现让 PM1-S9~PM1-S11 通过的最小代码
- [ ] 4.4 记录 Green 通过证据（单测/组件测/契约测）到 RUN_LOG

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽取重复的 Zod schema 与 IPC 错误封装逻辑，保持测试全绿
- [ ] 5.2 不改变 `project:*` 对外契约与错误码

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（Scenario 映射、Red 失败、Green 通过、关键命令输出）
- [ ] 6.2 记录 Storybook 4+3 态截图或执行证据
- [ ] 6.3 记录门禁与 Rulebook 校验证据

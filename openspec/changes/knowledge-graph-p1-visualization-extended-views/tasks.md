## 1. Specification

- [ ] 1.1 审阅并确认 KG-2 仅覆盖可视化关系图与扩展视图（时间线/角色卡）
- [ ] 1.2 审阅并确认 KG-2 依赖 KG-1 合并后才可进入实现
- [ ] 1.3 审阅并确认技术选型 `d3-force + d3-zoom` 与 design token 对齐要求

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] KG2-R1-S1 关系图展示项目实体
  - 目标测试：`apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.render.test.tsx`
  - 用例：`should render force-directed graph with typed node colors and relation labels`
- [ ] KG2-R1-S2 关系图空状态
  - 目标测试：`apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.empty-state.test.tsx`
  - 用例：`should render empty state and create-node CTA when graph has no entities`
- [ ] KG2-R1-S3 节点拖拽与缩放
  - 目标测试：`apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.interaction.test.tsx`
  - 用例：`should update node positions on drag and zoom around cursor anchor`
- [ ] KG2-R2-S1 时间线按章节展示并支持拖拽排序
  - 目标测试：`apps/desktop/renderer/src/features/kg/TimelineView.ordering.test.tsx`
  - 用例：`should render chapter-based axis and persist event reordering`
- [ ] KG2-R2-S2 角色卡列表展示
  - 目标测试：`apps/desktop/renderer/src/features/character/CharacterCardList.test.tsx`
  - 用例：`should render avatar placeholder name type attributes and relation summary`
- [ ] KG2-R2-S3 角色卡空状态
  - 目标测试：`apps/desktop/renderer/src/features/character/CharacterCardEmptyState.test.tsx`
  - 用例：`should show empty state and create-character CTA when no character entities`
- [ ] KG2-A-S1 Storybook 覆盖完整
  - 目标测试：`apps/desktop/renderer/src/features/kg/kg-views.stories.snapshot.test.ts`
  - 用例：`should cover graph(3 states) and character-card(3 states) story snapshots`

## 3. Red（先写失败测试）

- [ ] 3.1 先为 KG2-R1-S1~KG2-R1-S3 编写失败测试并确认 Red（关系图渲染与交互）
- [ ] 3.2 再为 KG2-R2-S1~KG2-R2-S3 编写失败测试并确认 Red（时间线与角色卡）
- [ ] 3.3 最后为 KG2-A-S1 编写 Storybook 快照失败测试并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让关系图渲染与交互测试通过的最小代码
- [ ] 4.2 仅实现让时间线与角色卡测试通过的最小代码
- [ ] 4.3 仅实现 Storybook 场景覆盖所需最小代码，不引入自动识别与 AI 注入功能

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离 graph 渲染 adapter，隔离 `d3-force` 细节与 UI 组件
- [ ] 5.2 统一时间线与角色卡的 token 使用，移除硬编码样式
- [ ] 5.3 保持所有渲染/交互测试与 Storybook 快照绿灯

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Scenario 映射、Red 失败输出、Green 通过输出
- [ ] 6.2 记录关键命令输出（组件测试、Storybook 快照）
- [ ] 6.3 记录 Rulebook validate、门禁检查与 PR 证据

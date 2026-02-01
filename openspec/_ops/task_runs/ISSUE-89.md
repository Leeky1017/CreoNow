# ISSUE-89

- Issue: #89
- Branch: task/89-p1-card-golden-standard
- PR: <fill-after-created>

## Plan

- 创建 Card.stories.tsx（展示所有 variant/状态/边界情况）
- 创建 Card.test.tsx（42 个测试用例全覆盖）
- AI 可视化自检（通过 Storybook + MCP 浏览器）
- 更新 Card.md 生成卡片（与实际实现一致）

## Runs

### 2026-02-01 22:15 Card.stories.tsx 创建

- Command: `Write Card.stories.tsx`
- Key output: 创建完整的 Storybook Story，包含：
  - 基础 Stories（Default, Raised, Bordered）
  - Hoverable 状态展示
  - Slot 模式演示（Header + Content + Footer）
  - 边界情况（空内容、超长文本、嵌套、Emoji）
  - 完整矩阵展示（FullMatrix）
  - 实际使用场景（ProjectCardScenario, SettingsCardScenario）
- Evidence: `apps/desktop/renderer/src/components/primitives/Card.stories.tsx`

### 2026-02-01 22:20 Card.test.tsx 创建

- Command: `pnpm --filter desktop test -- --run src/components/primitives/Card.test.tsx`
- Key output:
  ```
  ✓ renderer/src/components/primitives/Card.test.tsx (42 tests) 363ms
  Test Files  1 passed (1)
       Tests  42 passed (42)
  ```
- Evidence: `apps/desktop/renderer/src/components/primitives/Card.test.tsx`

### 2026-02-01 22:25 AI 可视化自检

- Command: `browser_navigate http://172.18.248.30:6010/?path=/story/primitives-card--full-matrix`
- Key output:
  - Full Matrix Story：3 种 Variants 正确渲染
  - Hoverable Story：可点击卡片样式正确
  - With Slots Story：Header + Content + Footer 布局正确
  - Project Card Scenario：中文内容和元信息布局正确
- Evidence: Storybook MCP 浏览器截图验证

### 2026-02-01 22:30 Card.md 更新

- Command: `StrReplace Card.md`
- Key output: 更新生成卡片与实际实现一致：
  - Props 接口（variant/hoverable/noPadding）
  - 状态矩阵
  - 阴影使用规则
  - 验收测试代码
  - AI 自检步骤和记录
- Evidence: `design/system/02-component-cards/Card.md`

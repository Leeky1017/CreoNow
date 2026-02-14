# 提案：s2-story-assertions

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（A3-M-002）指出：Story 测试中存在批量浅层断言（如仅判定对象存在），导致测试通过不能有效证明界面行为正确，形成覆盖率“看起来有、实际上弱”的质量风险。

## 变更内容

- 为现有仅做浅层断言的 Story 测试补充行为级断言（关键元素渲染、初始状态、必要交互反馈）。
- 优先修复 `AiPanel.stories.test.ts`，并扩展到同类 Story 测试文件。
- 建立“浅层断言不可单独作为验收依据”的测试编写约束。

## 受影响模块

- Cross-Module Integration（Story 测试链路）— 断言粒度从对象存在提升为行为验证。
- Workbench/AI 相关 Story 测试文件 — 重点包含 `AiPanel` 场景。

## 依赖关系

- 上游依赖：无强依赖（Sprint 2 债务组独立项）。
- 执行分组：位于推荐执行顺序 W4（与 `s2-test-timing-fix` 同批）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 债务组 `s2-story-assertions` 条目；
  - Sprint 2 依赖关系中“债务组内部全部独立”约束。
- 核对项：
  - 范围限定为 Story 测试断言增强，不扩展到功能实现改动；
  - 优先覆盖 roadmap 明确点名的 `AiPanel` 测试；
  - 与 `s2-test-timing-fix` 并行推进无冲突。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- 禁止用 `toBeDefined`、`toBeTruthy` 之类浅层断言替代行为断言。
- 行为断言应锚定用户可见结果，不要退化为实现细节断言。
- 统一断言口径，避免不同 Story 文件出现“同类场景不同验收标准”。

## 防治标签

- `FAKETEST`

## 不做什么

- 不改动 Story 对应组件的业务实现。
- 不引入新的 UI 测试框架。
- 不在本 change 内处理异步等待机制改造（该项由 `s2-test-timing-fix` 负责）。

## 审阅状态

- Owner 审阅：`PENDING`

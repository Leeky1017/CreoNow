## 1. Specification

- [x] 1.1 审阅主 spec `skill-system/spec.md` 中「技能触发方式」的全部 Scenario（2 个）
- [x] 1.2 审阅主 spec 中「技能作用域管理」的全部 Scenario（3 个）
- [x] 1.3 审阅作用域优先级解析规则（project > global > builtin）
- [x] 1.4 审阅技能启停持久化（`skill:registry:toggle` IPC 通道，语义对齐主规范 `skill:toggle`）
- [x] 1.5 依赖同步检查（Dependency Sync Check）：上游 `skill-system-p0`；核对技能注册表结构、SkillExecutor 接口、execute IPC 通道 schema

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「用户通过技能面板选择并执行技能」→ `apps/desktop/renderer/src/features/ai/__tests__/skill-trigger-scope-management.test.tsx`
- [x] 2.2 S「技能面板无自定义技能时的空状态」→ `apps/desktop/renderer/src/features/ai/SkillPicker.test.tsx`
- [x] 2.3 S「用户停用内置技能」→ `apps/desktop/tests/unit/skill-scope-management.test.ts`
- [x] 2.4 S「项目级技能覆盖全局技能」→ `apps/desktop/renderer/src/features/ai/SkillPicker.test.tsx` + `apps/desktop/tests/unit/skill-scope-management.test.ts`
- [x] 2.5 S「用户将项目级技能提升为全局」→ `apps/desktop/tests/unit/skill-scope-management.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写技能选择面板（展开/选择/空状态/禁用态）的失败测试
- [x] 3.2 编写作用域管理（优先级解析/启停/升降）的失败测试
- [x] 3.3 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现技能选择面板组件（分类列表、输入来源判断、灰显逻辑）
- [x] 4.2 最小实现作用域解析器（project → global → builtin 优先级）
- [x] 4.3 最小实现 `skill:registry:toggle` IPC 通道与持久化（语义对齐主规范 `skill:toggle`）
- [x] 4.4 最小实现作用域升降（project ↔ global）

## 5. Refactor（保持绿灯）

- [x] 5.1 抽象作用域解析为独立 `ScopeResolver` 模块
- [x] 5.2 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作

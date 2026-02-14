## 1. Specification

- [x] 1.1 审阅 `unified-roadmap` 中 AR-C17 的范围、依赖与执行建议
- [x] 1.2 审阅 `editor`/`skill-system` 主 spec 的 Bubble Menu 与技能调用约束
- [x] 1.3 完成 `editor-delta.md` 的 Requirement/Scenario 固化
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录 `NO_DRIFT/DRIFT` 结论

### Dependency Sync Check

- 输入：
  - `docs/plans/unified-roadmap.md`（AR-C17：Bubble Menu AI 按钮；依赖 C14）
  - `openspec/specs/editor/spec.md`（Bubble Menu 可见性与折叠选区隐藏约束）
  - `openspec/specs/skill-system/spec.md`（技能触发与调用契约）
  - `openspec/changes/archive/s2-writing-skills/specs/skill-system-delta.md`（写作技能标识稳定性）
- 核对项：
  - 仅扩展 Bubble Menu AI 入口，不改固定工具栏行为
  - 菜单动作绑定稳定技能 ID（`builtin:polish`/`builtin:rewrite`/`builtin:describe`/`builtin:dialogue`）
  - 调用参数包含选中文本与 `selectionRef`
- 结论：`NO_DRIFT`
- 后续动作：进入 Red 测试实现；不调整执行引擎与 IPC 协议（Out of Scope 保持不变）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 每个 Scenario 映射为至少一个测试
- [x] 2.2 为测试标注 Scenario ID（S2-BA-1/2）并建立追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID | 测试文件                                                        | 测试用例                                                                                                                                          | 断言要点                                            |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| S2-BA-1     | `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx` | `S2-BA-1 should show Bubble Menu with inline actions when selection is non-empty` + `S2-BA-1 should hide Bubble Menu when selection is collapsed` | 非空选区时显示 Bubble AI 菜单项；折叠选区后隐藏     |
| S2-BA-2     | `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx` | `S2-BA-2 should trigger mapped skill with selection text and selection reference when clicking Bubble AI item`                                    | 点击菜单触发目标技能调用，且传入选中文本 + 选区引用 |

## 3. Red（先写失败测试）

- [x] 3.1 编写“选中文本时显示 Bubble AI 菜单”的失败测试
- [x] 3.2 编写“点击菜单项触发目标技能调用”的失败测试
- [x] 3.3 运行目标测试并记录 Red 失败证据

### Red 证据

- 命令：`pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorPane.test.tsx`
- 结果：`13 tests | 2 failed`
- 关键失败：
  - `Unable to find an element by: [data-testid="bubble-ai-polish"]`
  - `Unable to find an element by: [data-testid="bubble-ai-rewrite"]`

## 4. Green（最小实现通过）

- [x] 4.1 实现 BubbleAiMenu 组件与最小集成逻辑
- [x] 4.2 对齐技能标识与调用参数并使 Red 用例转绿
- [x] 4.3 复跑映射测试并确认全部通过

### Green 证据

- 命令：`pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorPane.test.tsx`
- 结果：`13 passed (13)`
- 核对点：
  - S2-BA-1：Bubble AI 菜单在非空选区显示、折叠选区隐藏
  - S2-BA-2：点击 AI 菜单触发 `builtin:rewrite`，入参含选中文本与 `selectionRef`

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛组件边界，避免不必要抽象层与重复适配代码
- [x] 5.2 保持菜单状态与选区状态同步逻辑可追踪
- [x] 5.3 复跑相关回归测试确保无行为回退

### 回归证据

- 命令：`pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorToolbar.test.tsx`
- 结果：`9 passed (9)`
- 命令：`pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/skill-trigger-scope-management.test.tsx`
- 结果：`1 passed (1)`

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 命令与关键输出
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、结论与后续动作
- [x] 6.3 记录 Scenario→测试映射与防治标签落实结果

> 注：根据本次交付指令“不要改 RUN_LOG”，本轮证据先完整落盘于 `tasks.md`，未改动 RUN_LOG 文件。

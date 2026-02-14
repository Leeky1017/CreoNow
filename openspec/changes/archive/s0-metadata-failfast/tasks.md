## 1. Specification

- [x] 1.1 审阅并确认需求边界（仅限 KG metadata 解析失败的 fail-fast；不得引入额外“修复”）
- [x] 1.2 审阅并确认错误路径与边界路径（非法 JSON、空字符串、非对象 JSON、超大字符串截断日志）
- [x] 1.3 审阅并确认验收阈值与不可变契约（解析失败不得覆盖原 metadata；不得静默写入）
- [x] 1.4 依赖同步检查（Dependency Sync Check）：N/A（无上游 active change）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.4 Scenario→测试映射：`KG-S0-MFF-S1` → `apps/desktop/renderer/src/features/kg/metadata-parse-failfast.test.tsx`（`"KG-S0-MFF-S1 kgToGraph: invalid metadataJson preserves original"` + edge path）
- [x] 2.5 Scenario→测试映射：`KG-S0-MFF-S2` → `apps/desktop/renderer/src/features/kg/metadata-parse-failfast.test.tsx`（`"KG-S0-MFF-S2 KnowledgeGraphPanel: parseMetadataJson invalid path fail-fast stops timeline write"`）

## 3. Red（先写失败测试）

- [x] 3.1 编写 Happy Path 的失败测试并确认先失败（metadata 合法时写入位置/顺序仍然生效）
- [x] 3.2 编写 Edge Case 的失败测试并确认先失败（metadataJson 为 `""`/仅空白/合法但非对象）
- [x] 3.3 编写 Error Path 的失败测试并确认先失败（非法 JSON 时保持原始 metadata，不覆盖回写；`parseMetadataJson` 返回 `null`）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Red 转绿的最小代码
- [x] 4.2 逐条使失败测试通过，不引入无关功能

## 5. Refactor（保持绿灯）

- [x] 5.1 去重与重构，保持测试全绿（复用既有 parse/merge helper，避免重复链路）
- [x] 5.2 不改变已通过的外部行为契约

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）（本 change 为 N/A 也需记录 N/A 理由）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

## 7. Evidence Notes

- Red：
  - `pnpm -C apps/desktop exec vitest run src/features/kg/metadata-parse-failfast.test.tsx`（Exit `1`）
  - 失败断言 1：非法 `metadataJson` 被错误覆盖为新 JSON，而不是保留原串
  - 失败断言 2：`KnowledgeGraphPanel` timeline 重排在非法 metadata 下仍调用 `entityUpdate`
- Green：
  - `pnpm -C apps/desktop exec vitest run src/features/kg/metadata-parse-failfast.test.tsx`（Exit `0`, `4 passed`）
  - `pnpm -C apps/desktop exec vitest run src/features/kg/metadata-parse-failfast.test.tsx src/features/kg/KnowledgeGraphPanel.render.test.tsx src/features/kg/KnowledgeGraphPanel.interaction.test.tsx src/features/kg/KnowledgeGraphPanel.empty-state.test.tsx src/features/kg/TimelineView.ordering.test.tsx`（Exit `0`, `8 passed`）
- Dependency Sync Check：
  - 输入：`openspec/changes/s0-metadata-failfast/proposal.md`、`openspec/specs/knowledge-graph/spec.md`、`openspec/changes/EXECUTION_ORDER.md`
  - 结论：`N/A / NO_DRIFT`（本 change 无上游 active change，且仅对 Renderer metadata fail-fast 契约做最小闭环）

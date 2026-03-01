## 1. Specification

更新时间：2026-03-01 13:17

- [x] 1.1 审阅并确认需求边界：对齐 `workbench/spec.md` 与实现之间的漂移——IconBar 入口、`graph`/`knowledgeGraph` 命名、RightPanel tab 枚举。只做 spec 对齐与决策落盘，不做功能实现。
- [x] 1.2 审阅并确认漂移点全集：
  - IconBar：存在实质漂移。spec 入口顺序/集合为 `files → outline → characters → media[FUTURE] → knowledgeGraph`，实现为 `files → search → outline → versionHistory → memory → characters → knowledgeGraph`（缺 `media`、多 `search/versionHistory/memory`）。
  - 命名：`graph` vs `knowledgeGraph` 双栈在当前主 spec 与代码中未复现（现状统一为 `knowledgeGraph`）。
  - RightPanel：主 spec 与代码当前都为 `ai/info/quality`，未发现“二项 vs 三项”矛盾。
- [x] 1.3 审阅并确认不可变契约：同一面板不得存在同义双 ID；spec 内不得自相矛盾。
- [x] 1.4 依赖同步检查（Dependency Sync Check）：
  - [x] D1（IconBar `media` 面板处置）Owner 决策已确认 — 保留但标注 `[FUTURE]`
  - [x] D2（`graph` vs `knowledgeGraph` 命名）Owner 决策已确认 — 统一到 `knowledgeGraph`（仅改 spec，代码零改动）
  - [x] D3（RightPanel `Quality` tab 保留/移除）Owner 决策已确认 — 保留，更新 Spec 为三 tab

### 1.5 预期实现触点

- `openspec/changes/fe-spec-drift-iconbar-rightpanel-alignment/specs/workbench/spec.md`（delta spec 修改）：
  - D1：保留 `media[FUTURE]`，并明确“当前实现入口顺序”与“未来入口”区分
  - D2：统一语义 ID 为 `knowledgeGraph`
  - D3：明确 RightPanel 为 `AI/Info/Quality` 三 tab（`ai/info/quality`）
- `apps/desktop/renderer/src/components/layout/__tests__/panel-id-ssot.guard.test.ts`（Guard 对齐）：
  - 读取 `layoutStore.tsx` + `IconBar.tsx` 与稳定契约常量，验证 D1/D2/D3
  - 读取主 `workbench/spec.md` 校验 `media` 的 `[FUTURE]` 标注持续存在
  - 不读取 `openspec/changes/fe-spec-drift-iconbar-rightpanel-alignment/**` 活跃 change 路径，避免归档后路径漂移
  - 不修改 `IconBar.tsx` / `layoutStore.tsx` 业务实现

**为什么是这些触点**：本轮为 Green（契约对齐）阶段，目标是在不改业务行为前提下，以“稳定路径契约（主 spec + 源码）”让 guard 复绿并可归档。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID | 测试文件（计划） | 测试名称（计划） | 断言要点 | Mock/依赖 | 运行命令 |
| ----------- | ---------------- | ---------------- | -------- | --------- | -------- |
| `WB-FE-DRIFT-S1` | `apps/desktop/renderer/src/components/layout/__tests__/panel-id-ssot.guard.test.ts` | `it('IconBar current order stays aligned with owner-decided contract and keeps media as [FUTURE]')` | 读取 `IconBar.tsx`，断言“当前实现入口顺序”一致；读取主 `workbench/spec.md` 断言 `media` 仍标注 `[FUTURE]` | `fs.readFileSync` | `pnpm -C apps/desktop test:run components/layout/__tests__/panel-id-ssot.guard` |
| `WB-FE-DRIFT-S2` | 同上 | `it('knowledge graph semantic ID is fixed to knowledgeGraph')` | 读取 `layoutStore.tsx` + `IconBar.tsx`，断言语义 ID 固定为 `knowledgeGraph` 且代码无 `graph` 最终 ID | `fs.readFileSync` | 同上 |
| `WB-FE-DRIFT-S3` | 同上 | `it('RightPanel tab set matches spec enum (ai/info/quality)')` | 读取 `layoutStore.tsx`，断言 `AI/Info/Quality` 三 tab 与 `activeRightPanel` 枚举一致 | `fs.readFileSync` | 同上 |

### 可复用测试范本

- panel-orchestrator 测试：`apps/desktop/renderer/src/components/layout/__tests__/panel-orchestrator.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 `WB-FE-DRIFT-S1`：读取 `workbench/spec.md` + `IconBar.tsx`，断言 IconBar 入口 ID 顺序/集合一致。
  - 期望红灯原因：当前实现缺 `media` 且多 `search/versionHistory/memory`。
- [x] 3.2 `WB-FE-DRIFT-S2`：断言 `graph`/`knowledgeGraph` 不出现同义双栈。
  - 期望红灯原因：若后续回归引入双 ID，将被直接阻断（当前预期可通过）。
- [x] 3.3 `WB-FE-DRIFT-S3`：断言 RightPanel 枚举与 spec 一致。
  - 期望红灯原因：若后续 spec/代码再漂移，将被直接阻断（当前预期可通过）。
- 运行：`pnpm -C apps/desktop test:run components/layout/__tests__/panel-id-ssot.guard`
  - 实际结果：`1 failed | 2 passed`（命中 Red：S1 失败，S2/S3 通过）

## 4. Green（最小实现通过）

- [x] 4.1 按 D2 决策统一语义 ID 为 `knowledgeGraph`（delta spec + guard 契约） → S2 转绿
- [x] 4.2 按 D3 决策明确 RightPanel 为 `AI/Info/Quality` 三 tab（delta spec + guard 契约） → S3 转绿
- [x] 4.3 修复 delta spec 内部歧义描述（“待决策”口径改为“已决策”） → Guard 一致性转绿
- [x] 4.4 按 D1 决策保留 `media[FUTURE]` 并区分“当前实现入口顺序”与“未来入口”；guard 同步去除活跃 change 路径耦合

## 5. Refactor（保持绿灯）

- [x] 5.1 确认仅调整 delta spec 与 guard，未引入业务实现改动，且 guard 仅依赖稳定路径
- [x] 5.2 确认 delta spec 使用规范标记（`[MODIFIED]`/`[ADDED]`）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG：D1/D2/D3 决策输入与落盘结果
- [x] 6.2 记录 RUN_LOG：guard 测试通过输出与“去活跃 change 路径耦合”说明
- [x] 6.3 记录 RUN_LOG：`pnpm -C apps/desktop test:run` 全量回归通过（`Test Files 189 passed (189)`；`Tests 1555 passed (1555)`）
- [x] 6.4 记录 Dependency Sync Check：D1/D2/D3 决策状态
- [x] 6.5 Main Session Audit（Apply 阶段已完成，详见 `openspec/_ops/task_runs/ISSUE-797.md`）

## 1. Specification

- [x] 1.1 审阅并确认 `s3-entity-completion` 边界：仅新增编辑器实体补全交互，不扩展编辑器其他能力。
- [x] 1.2 审阅并确认错误与边界路径：无结果、查询失败、光标迁移异常均需可验证。
- [x] 1.3 审阅并确认验收阈值：补全插入行为稳定且不破坏现有输入/保存链路。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 预期 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [x] `S3-EC-S1`：`apps/desktop/renderer/src/features/editor/__tests__/entity-completion.trigger.test.tsx` → `shows candidates and supports keyboard navigation + enter confirm`
- [x] `S3-EC-S2`：`apps/desktop/renderer/src/features/editor/__tests__/entity-completion.insert.test.tsx` → `inserts canonical entity text and keeps typing continuity`
- [x] `S3-EC-S3`：`apps/desktop/renderer/src/features/editor/__tests__/entity-completion.empty-state.test.tsx` → `shows deterministic empty/error state and keeps user input intact`

## 3. Red（先写失败测试）

- [x] 3.1 新增 `S3-EC-S1` 失败测试，验证当前缺少实体前缀触发补全能力。
- [x] 3.2 新增 `S3-EC-S2` 失败测试，验证插入后光标与状态约束。
- [x] 3.3 新增 `S3-EC-S3` 失败测试，验证无结果/异常提示路径。
- [x] 3.4 运行最小测试集并记录 Red 证据（命令 + 失败输出）。

## 4. Green（最小实现通过）

- [x] 4.1 落地实体补全最小交互（触发、候选列表、确认插入），使 `S3-EC-S1/S2/S3` 转绿。
- [x] 4.2 对齐编辑器状态管理与提示文案约定，保持现有输入链路不变。
- [x] 4.3 复跑 Scenario 对应测试并确认通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 去重候选映射与渲染逻辑，保持组件职责清晰。
- [x] 5.2 对齐 Editor feature 目录结构与命名，避免风格漂移。
- [x] 5.3 回归受影响编辑器测试，确认无行为回归。

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作。
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

### Dependency Sync Check Record (Pre-Red)

- Inputs:
  - `openspec/specs/editor/spec.md`
  - `openspec/changes/s3-entity-completion/proposal.md`
  - `openspec/changes/s3-entity-completion/specs/editor-delta.md`
  - `packages/shared/types/ipc-generated.ts` (`knowledge:entity:list` contract)
- Checks:
  - 仅新增编辑器侧实体补全交互，不改动现有输入/保存主链路
  - 复用既有 `knowledge:entity:list` 契约，不扩展 IPC schema
  - 空态/错误态均需可见，且不清空用户已输入文本
- Result: `NO_DRIFT`
- Follow-up: 进入 Red 阶段并记录失败证据

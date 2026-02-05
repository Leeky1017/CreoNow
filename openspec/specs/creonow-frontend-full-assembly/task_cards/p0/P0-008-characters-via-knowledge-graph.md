# P0-008: Characters（复用 Knowledge Graph 作为 SSOT）

Status: todo

## Goal

把 Sidebar → Characters 面板补齐为真实可用闭环，并遵循“一条链路一套实现”：

- 不新增第二套 characters 后端系统（不加 `character:*` IPC）
- Characters 作为 Knowledge Graph 的一个“特定视图”
  - `entityType="character"`
  - `metadataJson` 存人物详细字段（role/group/traits 等）
  - 关系复用 `kg:relation:*`

## Assets in Scope（对应 Storybook Inventory）

- `Features/CharacterPanel`
-（组装点）`Layout/Sidebar`

## Dependencies

- Spec: `../spec.md#cnfa-req-005`
- Design: `../design/03-ipc-reservations.md`（Characters via KG 约定）
- P0-012: `./P0-012-aidialogs-systemdialog-and-confirm-unification.md`（删除确认）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/stores/kgStore.ts`（支持 metadataJson 的 create/update） |
| Add | `apps/desktop/renderer/src/features/character/characterFromKg.ts`（映射：KG → Character + schema 解析） |
| Add | `apps/desktop/renderer/src/features/character/CharacterPanelContainer.tsx`（接 kgStore，提供 CRUD callbacks） |
| Update | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`（使用 container，移除 `characters={[]}`） |
| Add | `apps/desktop/renderer/src/features/character/characterFromKg.test.ts`（边界测试：metadataJson 解析） |
| Add | `apps/desktop/tests/e2e/characters.spec.ts`（新增门禁：CRUD + relations） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：KG → Character 映射 + unit（先把 schema/降级写死）
2. PR-B：CharacterPanelContainer + Sidebar 接入（移除 `characters={[]}`）
3. PR-C：Relations 最小闭环 + E2E 门禁（CRUD + relations）

## Conflict Notes（并行约束）

- `Sidebar.tsx` 与其他 panel wiring 任务冲突风险高：优先把业务逻辑下沉到 container，避免多人同时改壳文件（见 `design/09-parallel-execution-and-conflict-matrix.md`）。

## Acceptance Criteria

- [ ] Characters 数据来源：
  - [ ] 仅来自 `kg:graph:get` 的 entities（过滤 `entityType="character"`）
  - [ ] metadataJson 解析失败时必须降级（不崩溃；显示“字段缺失/无效”）
- [ ] CRUD：
  - [ ] Create：在 Characters 面板可创建人物（至少 name + role/group 默认值）
  - [ ] Update：编辑人物详情保存后立即反映在列表
  - [ ] Delete：使用 SystemDialog 确认；删除后列表移除
- [ ] Relations（最小闭环）：
  - [ ] 在人物详情中至少能新增/删除一条关系（复用 `kg:relation:create/delete`）
  - [ ] 关系显示使用枚举值（来自 `features/character/types.ts`）或提供降级展示
- [ ] 禁止占位：
  - [ ] Sidebar 不再渲染空数组 `characters={[]}`

## Tests

- [ ] Unit `characterFromKg.test.ts`：
  - [ ] metadataJson 缺失 → 使用默认值
  - [ ] metadataJson 非法 JSON → 可观察降级
  - [ ] role/group 不在枚举 → 降级为默认或 “others”
- [ ] E2E `characters.spec.ts`：
  - [ ] 创建项目 → 打开 Characters 面板
  - [ ] 新建人物 → 在列表可见
  - [ ] 编辑人物字段 → 保存后可见
  - [ ] 新增关系 → 在 UI 可见
  - [ ] 删除人物（确认）→ 列表移除

## Edge cases & Failure modes

- KG 返回空 graph：
  - Characters 显示空态与引导（例如“Create your first character”）
- 并发更新（多个面板同时编辑）：
  - 以 “最后写入胜出” 或显式冲突策略为准，但必须可判定（不得 silent）

## Observability

- KG 更新失败时必须显示 `error.code: error.message`
- main.log 已有 KG 相关日志（若缺失需补齐）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/CharacterPanel`：
  - [ ] 分组/列表 hover/focus 正常
  - [ ] 详情弹窗布局与滚动正确（留证到 RUN_LOG；证据格式见 `../design/08-test-and-qa-matrix.md`）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

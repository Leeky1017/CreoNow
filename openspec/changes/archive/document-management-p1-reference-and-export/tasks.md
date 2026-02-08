## 1. Specification

- [x] 1.1 确认本 change 仅覆盖 2 个 requirement：文档间互相引用、文档导出
- [x] 1.2 确认强制覆盖点已入 spec：引用失效处理、导出进度可见性、导出错误码可见性、单文档/项目导出路径
- [x] 1.3 确认本 change 仅做 OpenSpec 拆分，不进入代码实现

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未记录 Red 失败证据前，不得进入 Green 实现
- [x] 2.4 未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] DM-P1-REF-S1 `用户通过 [[ 插入文档引用 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/editor/reference-linking.test.tsx`
  - 用例：`should insert a reference node when user picks a document from [[ search popover`
- [x] DM-P1-REF-S2 `用户点击引用节点跳转到目标文档 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/editor/reference-navigation.test.tsx`
  - 用例：`should open target document when user clicks a valid reference node`
- [x] DM-P1-REF-S3 `被引用文档删除后的失效处理 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/editor/reference-invalid-state.test.tsx`
  - 用例：`should render deleted reference as disabled strike-through and block navigation`
- [x] DM-P1-EXP-S1 `用户导出单文档并选择保存路径 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/unit/exportService.document.test.ts`
  - 用例：`should export one document through export:document using selected save path`
- [x] DM-P1-EXP-S2 `用户导出整个项目并选择保存路径 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/unit/exportService.project.test.ts`
  - 用例：`should export project chapters in order through export:project using selected save path`
- [x] DM-P1-EXP-S3 `导出进度可见性 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/export/ExportDialog.progress.test.tsx`
  - 用例：`should show stage and percentage progress while export is running`
- [x] DM-P1-EXP-S4 `导出失败时错误码与失败策略可见 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/export/ExportDialog.error-visibility.test.tsx`
  - 用例：`should display error code and retry/change-path actions when export fails`

## 3. Red（先写失败测试）

- [x] 3.1 完成 Red 阶段门禁定义：实现阶段必须先产出 DM-P1-REF-S1..S3 的失败测试
- [x] 3.2 完成 Red 阶段门禁定义：实现阶段必须先产出 DM-P1-EXP-S1..S4 的失败测试
- [x] 3.3 明确 Red 错误码证据位：`EXPORT_WRITE_ERROR` / `EXPORT_TRANSFORM_ERROR`
- [x] 3.4 明确 Red 证据落盘位置：`openspec/_ops/task_runs/ISSUE-280.md`
- [x] 3.5 记录本 change 为 OpenSpec-only，Red 执行留待下游实现 Issue（不在本次执行）

## 4. Green（最小实现通过）

- [x] 4.1 完成 Green 阶段最小实现范围定义（引用能力）
- [x] 4.2 完成 Green 阶段最小实现范围定义（单文档/项目导出路径）
- [x] 4.3 完成 Green 阶段最小实现范围定义（进度可见性）
- [x] 4.4 完成 Green 阶段最小实现范围定义（错误码 + 失败策略可见性）
- [x] 4.5 明确 Green 证据位：UI 必须可见 `code + message` 与 `重试/更换路径`
- [x] 4.6 记录本 change 不执行 Green 编码，仅交付实现门禁输入

## 5. Refactor（保持绿灯）

- [x] 5.1 定义 Refactor 约束：不改变外部契约（IPC/错误码/可见性）
- [x] 5.2 定义 Refactor 目标：统一错误码映射避免语义漂移
- [x] 5.3 定义 Refactor 验证：实现阶段必须全量回归保持绿灯

## 6. Evidence

- [x] 6.1 已记录 RUN_LOG：`openspec/_ops/task_runs/ISSUE-280.md`
- [x] 6.2 已记录关键命令输出：preflight、Rulebook validate、证据检索命令
- [x] 6.3 已记录错误码证据位要求（至少覆盖 `EXPORT_WRITE_ERROR`）
- [x] 6.4 已记录导出进度证据位要求（阶段文案 + 百分比）

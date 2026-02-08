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

- [ ] 3.1 为 DM-P1-REF-S1/REF-S2 编写失败测试并确认先失败
- [ ] 3.2 为 DM-P1-REF-S3（引用失效）编写失败测试并确认先失败
- [ ] 3.3 为 DM-P1-EXP-S1/EXP-S2（单文档/项目导出路径）编写失败测试并确认先失败
- [ ] 3.4 为 DM-P1-EXP-S3（导出进度可见）编写失败测试并确认先失败
- [ ] 3.5 为 DM-P1-EXP-S4（错误码可见与失败策略）编写失败测试并确认先失败
- [ ] 3.6 Red 证据位：记录 `EXPORT_WRITE_ERROR` / `EXPORT_TRANSFORM_ERROR` 的失败日志与断言输出
- [ ] 3.7 Red 证据位：将失败命令输出写入 `openspec/_ops/task_runs/ISSUE-<N>.md`

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 DM-P1-REF-S1/REF-S2 测试转绿的最小代码
- [ ] 4.2 仅实现让 DM-P1-REF-S3（失效引用样式与不可点击）测试转绿的最小代码
- [ ] 4.3 仅实现让 DM-P1-EXP-S1/EXP-S2（路径选择+导出调用）测试转绿的最小代码
- [ ] 4.4 仅实现让 DM-P1-EXP-S3（进度可见）测试转绿的最小代码
- [ ] 4.5 仅实现让 DM-P1-EXP-S4（错误码可见与失败策略）测试转绿的最小代码
- [ ] 4.6 Green 证据位：记录错误码在 UI 可见（code + message）及 `重试/更换路径` 策略可用的通过证据

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重引用节点渲染与导出状态处理逻辑，保持外部行为不变
- [ ] 5.2 统一导出错误码映射表，避免 Renderer/Main 双份语义漂移
- [ ] 5.3 全量回归相关测试保持绿灯

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（Scenario 映射、Red 失败证据、Green 通过证据）
- [ ] 6.2 记录关键命令输出（单测、集成测试、规则校验）
- [ ] 6.3 记录错误码可见性证据（至少覆盖 `EXPORT_WRITE_ERROR`）
- [ ] 6.4 记录导出进度可见性证据（至少覆盖阶段文案 + 百分比）

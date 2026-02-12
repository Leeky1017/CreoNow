## 1. Specification

- [x] 1.1 审阅 `workbench/spec.md` 中 Icon Bar 列表（:76-85）与实际代码 `IconBar.tsx:57-80` 的差异
- [x] 1.2 审阅 `workbench/spec.md` 中 RightPanel Tab 定义（:167）与实际代码 `layoutStore.tsx:35`、`RightPanel.tsx:62` 的差异
- [x] 1.3 审阅 `workbench/spec.md` 中 IPC 通道名（:236-237）与实际契约 `ipc-generated.ts:2430`、`ipc-contract.ts:1784` 的差异
- [x] 1.4 确认 `project:list:recent` 不存在于实际 IPC 契约，最近项目通过 `project:project:list` + 前端排序实现
- [x] 1.5 依赖同步检查（Dependency Sync Check）：N/A（本 change 无上游依赖，自身为 Phase A 基准）

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 本 change 为纯 Spec 文字对齐，不涉及功能代码变更，无需新增测试用例
- [x] 2.2 验证现有跨模块漂移检测测试 `cross-module-drift-zero.spec.ts` 覆盖 IPC 通道名一致性
- [x] 2.3 门禁确认：Spec-only change，TDD 要求降级为“确认现有测试无回归”

### Scenario -> Test 映射

- [x] S-IPC-NAME `项目切换 IPC 命名与契约一致` -> `apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- [x] S-SPEC-DRIFT `Spec-only 对齐不引入行为回归` -> `apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`

## 3. Red（先写失败测试）

- [x] 3.1 N/A — 纯 Spec 文字变更，无新功能测试（Red 门禁通过“环境/基线验证”执行）
- [x] 3.2 确认现有测试套件在 delta spec 应用后仍全绿（无 Spec 驱动的行为变更）

## 4. Green（最小实现通过）

- [x] 4.1 将 delta spec 标记应用到工作副本
- [x] 4.2 确认无代码需要变更（IPC 通道名代码已正确，Spec 文字对齐即可）

## 5. Refactor（保持绿灯）

- [x] 5.1 N/A — 无代码重构
- [x] 5.2 确认 delta spec 措辞与主 spec 风格一致

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含现有测试全绿证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 结论：N/A（无上游依赖）

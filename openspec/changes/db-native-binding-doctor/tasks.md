## 1. Specification

- [x] 1.1 明确 DB native 失败分类（ABI mismatch / bindings missing / unknown）
- [x] 1.2 明确 AI 面板链路错误展示必须可操作（含修复命令）
- [x] 1.3 明确 out-of-scope：不实现 AI 输出自动写回编辑器

## 2. TDD Mapping（先测前提）

- [x] 2.1 建立 Scenario → 测试映射（doctor 分类、IPC details、UI 提示）
- [x] 2.2 为每个场景定义 Red 失败证据命令与断言
- [ ] 2.3 设定门禁：未记录 Red 不进入实现

### Scenario → Test 映射

- [x] S1 `DB 初始化失败返回可执行修复建议 [ADDED]`
  - 测试：`apps/desktop/tests/unit/db-native-doctor.test.ts`
- [x] S2 `AI 相关 IPC 在 DB 不可用时返回诊断 details [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-db-not-ready-diagnostics.test.ts`
- [x] S3 `AI 面板在 DB_ERROR 时显示修复指引 [ADDED]`
  - 测试：`apps/desktop/renderer/src/features/ai/AiPanel.db-error.test.tsx`

## 3. Red（先写失败测试）

- [ ] 3.1 新增 doctor 单测并确认先失败
- [ ] 3.2 新增 IPC 诊断透传单测并确认先失败
- [ ] 3.3 新增 AI 面板提示单测并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 实现 DB doctor 分类与 remediation 命令生成
- [x] 4.2 在 AI/Skills/Proxy IPC DB not ready 分支接入诊断 details
- [x] 4.3 调整 AI 面板错误提示文案，展示可执行修复步骤

## 5. Refactor（保持绿灯）

- [x] 5.1 去重 DB_ERROR 诊断构造逻辑
- [x] 5.2 保持 IPC envelope 与错误码不变，仅增强 message/details

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（Red→Green 证据 + 关键命令输出）

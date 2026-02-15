## 1. Specification

- [ ] 1.1 审阅并确认 `s3-i18n-extract` 边界：仅替换 renderer 硬编码文案与同步 locale，不改功能行为。
- [ ] 1.2 审阅并确认 key 命名规范、命名空间策略与去重约束。
- [ ] 1.3 审阅并确认验收阈值：文案替换完成、双语资源对齐、无重复 key 漂移。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（依赖 `s3-i18n-setup`，预期 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [ ] S3-I18N-EXTRACT-S1 `Workbench 可见文案通过 locale key 渲染 [MODIFIED]`
  - 测试文件：`apps/desktop/renderer/src/features/__tests__/i18n-text-extract.test.tsx`
  - 测试名：`"replaces hardcoded chinese literals with t(key) rendering"`
- [ ] S3-I18N-EXTRACT-S2 `zh-CN 与 en 资源键集保持对齐 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/i18n/__tests__/locale-parity.test.ts`
  - 测试名：`"locale key sets stay in parity across zh-CN and en"`
- [ ] S3-I18N-EXTRACT-S3 `新增文案 key 复用既有命名空间并避免重复定义 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/i18n/__tests__/locale-duplication-guard.test.ts`
  - 测试名：`"new locale keys do not introduce duplicated semantic entries"`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S3-I18N-EXTRACT-S1 失败测试，确认当前仍存在硬编码文案。
- [ ] 3.2 编写 S3-I18N-EXTRACT-S2 失败测试，确认双语资源存在键集不一致风险。
- [ ] 3.3 编写 S3-I18N-EXTRACT-S3 失败测试，确认重复 key 防线尚未建立。

## 4. Green（最小实现通过）

- [ ] 4.1 按最小范围替换 renderer 文案为 `t('key')` 调用。
- [ ] 4.2 同步更新 `zh-CN.json` 与 `en.json` 并补齐缺失 key。
- [ ] 4.3 去除临时替换噪音，逐条使 Red 用例转绿。

## 5. Refactor（保持绿灯）

- [ ] 5.1 清理重复 key 与同义多命名项，收敛为单一路径。
- [ ] 5.2 复核组件内注释噪音，保持文案语义以 locale 文件为准。

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

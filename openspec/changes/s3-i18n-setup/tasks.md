## 1. Specification

- [x] 1.1 审阅并确认 `s3-i18n-setup` 边界：仅建立 i18n 初始化与 locale 骨架，不做全量文案替换。
- [x] 1.2 审阅并确认 Workbench 启动链路中的 i18n 装配入口与默认/回退语言约束。
- [x] 1.3 审阅并确认验收阈值：初始化可用、locale 骨架完整、缺失 key 行为可观测。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，标注 `N/A`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [x] S3-I18N-SETUP-S1 `Workbench 启动时装配 i18n 默认语言与回退语言 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/i18n/__tests__/i18n-setup.test.ts`
  - 测试名：`"initializes i18n with zh-CN default and en fallback"`
- [x] S3-I18N-SETUP-S2 `缺失 key 时回退到默认策略且不返回空串 [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/i18n/__tests__/i18n-setup.test.ts`
  - 测试名：`"missing key follows fallback strategy with observable output"`
- [x] S3-I18N-SETUP-S3 `Workbench 入口改为 key 驱动渲染路径 [MODIFIED]`
  - 测试文件：`apps/desktop/renderer/src/__tests__/app-shell-i18n-bootstrap.test.tsx`
  - 测试名：`"app shell renders via i18n provider instead of hardcoded literal"`

## 3. Red（先写失败测试）

- [x] 3.1 新增 S3-I18N-SETUP-S1 失败测试，确认当前缺少稳定初始化装配。
- [x] 3.2 新增 S3-I18N-SETUP-S2 失败测试，确认缺失 key 路径未满足可观测回退。
- [x] 3.3 新增 S3-I18N-SETUP-S3 失败测试，确认入口尚未统一 key 渲染。

## 4. Green（最小实现通过）

- [x] 4.1 新增 `renderer/src/i18n/index.ts` 并完成 i18n 初始化最小实现。
- [x] 4.2 新增 `zh-CN.json` 与 `en.json` locale 骨架并接入 provider。
- [x] 4.3 在 App 入口完成最小接线，仅实现使 Red 转绿的必要改动。

## 5. Refactor（保持绿灯）

- [x] 5.1 统一 key 命名空间与初始化配置，消除重复配置片段。
- [x] 5.2 复核 i18n 装配边界，避免业务文案替换逻辑提前混入本 change。

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

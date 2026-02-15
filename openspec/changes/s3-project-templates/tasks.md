## 1. Specification

- [ ] 1.1 审阅并确认 `s3-project-templates` 边界：仅交付模板服务、内置模板资源与创建流程接入。
- [ ] 1.2 审阅并确认模板 schema 与 `project:create` 既有契约映射关系。
- [ ] 1.3 审阅并确认验收阈值：模板可选、可应用、创建产物结构可验证。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，标注 `N/A`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [ ] S3-PROJECT-TPL-S1 `新建项目可选择内置模板并生成结构化初始内容 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
  - 测试名：`"applies built-in template during project creation"`
- [ ] S3-PROJECT-TPL-S2 `模板应用后保持项目创建对外契约不变 [MODIFIED]`
  - 测试文件：`apps/desktop/tests/integration/project-management/project-create-template-contract.test.ts`
  - 测试名：`"project:create contract stays stable when template is selected"`
- [ ] S3-PROJECT-TPL-S3 `非法自定义模板输入会被校验并返回明确错误 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/projects/__tests__/template-schema-validation.test.ts`
  - 测试名：`"rejects invalid custom template schema with explicit error"`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S3-PROJECT-TPL-S1 失败测试，确认当前创建流程未应用模板结构。
- [ ] 3.2 编写 S3-PROJECT-TPL-S2 失败测试，确认模板接入后契约稳定性防线尚未建立。
- [ ] 3.3 编写 S3-PROJECT-TPL-S3 失败测试，确认非法模板输入校验不足。

## 4. Green（最小实现通过）

- [ ] 4.1 实现模板服务最小能力并接入四类内置模板。
- [ ] 4.2 打通创建流程模板选择与应用路径，使 S1/S2 转绿。
- [ ] 4.3 增加模板 schema 校验并通过 S3。

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛模板应用流程，避免多层 helper 转发导致过度抽象。
- [ ] 5.2 去重模板字段映射逻辑，保持项目管理模块命名与组织一致。

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

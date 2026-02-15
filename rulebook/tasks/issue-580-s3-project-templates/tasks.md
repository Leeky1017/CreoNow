## 1. Specification

- [x] 1.1 阅读并确认 `openspec/specs/project-management/spec.md` 与 change delta。
- [x] 1.2 建立 S3-PROJECT-TPL-S1/S2/S3 对应测试映射与文件路径。
- [x] 1.3 完成无上游依赖声明与 Dependency Sync Check 结论记录（`N/A` + `NO_DRIFT`）。

## 2. TDD (Red → Green → Refactor)

- [x] 2.1 新增 RED 测试：`template-service-apply.test.ts`（S1）。
- [x] 2.2 新增 RED 测试：`project-create-template-contract.test.ts`（S2）。
- [x] 2.3 新增 RED 测试：`template-schema-validation.test.ts`（S3）。
- [x] 2.4 最小实现：模板资源 + 模板服务 + project:create 链路接入。
- [x] 2.5 最小实现：IPC contract/schema + shared ipc-generated 同步。
- [x] 2.6 最小实现：renderer create 流程透传模板参数。
- [x] 2.7 Refactor：模板映射与校验逻辑收敛，避免多层 helper 转发。

## 3. Verification & Governance

- [x] 3.1 运行 S1/S2/S3 focused tests（RED 与 GREEN 均留证）。
- [x] 3.2 运行受影响 project-management 回归测试（unit/integration/UI）。
- [x] 3.3 更新 RUN_LOG 与 change/tasks 勾选状态（Main Session Audit 项保留待 lead）。
- [x] 3.4 提交并推送到 `origin/task/580-s3-project-templates`（不创建 PR）。

## 1. Specification

- [x] 1.1 审阅并确认 `docs/plans/unified-roadmap.md` 中 `s1-doc-service-extract（A7-C-001 + A5-H-002）` 的边界：仅做 DocumentService 职责提取与门面收敛。
- [x] 1.2 审阅并确认 `documentService.ts` 中 CRUD/Version/Branch 现有职责切分点与保留契约（方法签名、错误语义、返回结构）。
- [x] 1.3 审阅并确认 `openspec/changes/s1-doc-service-extract/specs/document-management-delta.md` 的 Requirement/Scenario 可直接映射测试。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 预期 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试（子服务提取、门面契约保持、旧实现删除防复制）。
- [x] 2.2 为每个测试用例标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                                                  | 测试名称（拟定）                                                                | 断言要点                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| S1-DSE-S1   | `apps/desktop/main/src/services/documents/__tests__/document-service-extract.structure.test.ts`           | `extracts document CRUD/version/branch into dedicated sub-service factories`    | `documentCrudService`/`versionService`/`branchService` 已独立存在并可单独装配 |
| S1-DSE-S2   | `apps/desktop/tests/integration/document-management/document-service-facade-contract.test.ts`             | `document service facade delegates while keeping existing public contract`      | `createDocumentService` 对外方法签名、返回结构与错误语义保持不变              |
| S1-DSE-S3   | `apps/desktop/main/src/services/documents/__tests__/document-service-no-duplicate-implementation.test.ts` | `removes extracted legacy implementation paths to avoid duplicated logic drift` | 提取后旧实现不再并存，不存在同职责双实现链路                                  |

## 3. Red（先写失败测试）

- [x] 3.1 编写 S1-DSE-S1 失败测试，先验证当前结构仍为单体或未满足独立装配约束。
- [x] 3.2 编写 S1-DSE-S2 失败测试，先验证门面委托后契约一致性约束尚未满足。
- [x] 3.3 编写 S1-DSE-S3 失败测试，先验证旧实现删除约束未满足（存在重复链路）。
- [x] 3.4 运行最小测试集并记录 Red 证据（失败输出与 Scenario ID 对齐）。

## 4. Green（最小实现通过）

- [x] 4.1 新增 `types.ts`、`documentCrudService.ts`、`versionService.ts`、`branchService.ts`，完成最小职责提取。
- [x] 4.2 将 `documentService.ts` 收敛为门面层，按原契约委托子服务。
- [x] 4.3 删除已被提取的旧实现分支，确保单一实现来源。
- [x] 4.4 复跑 S1-DSE-S1/S2/S3 对应测试并确认全部 Green。

## 5. Refactor（保持绿灯）

- [x] 5.1 去重跨子服务的重复辅助逻辑，保持单一职责与可读性。
- [x] 5.2 复核门面层仅保留编排职责，防止业务逻辑回流导致重新单体化。
- [x] 5.3 复跑受影响文档管理测试集，确认外部契约无回归。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令、失败/通过输出与结论。
- [x] 6.2 在 RUN_LOG 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论（无漂移/已更新）。
- [x] 6.3 在 RUN_LOG 记录门面契约一致性与旧实现清理的验证证据。

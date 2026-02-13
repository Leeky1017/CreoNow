## 1. Specification

- [x] 1.1 审阅 `openspec/specs/ipc/spec.md` 与 `openspec/specs/knowledge-graph/spec.md`，确认 KG 实体/契约需一致包含 `aliases`
- [x] 1.2 审阅 `apps/desktop/main/src/ipc/contract/ipc-contract.ts` 与 `apps/desktop/main/src/services/kg/kgService.ts`，确认当前存在契约漂移
- [x] 1.3 依赖同步检查（Dependency Sync Check）：核对 `p2-kg-aliases` 归档产物（数据结构、IPC 契约、错误码、阈值），记录 `DRIFT_FOUND` 与修复范围

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                  | 测试用例名                                                                         | 断言要点                                                                   |
| ----------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S1          | `apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts` | `should return ok list result when entity response contains aliases`               | `knowledge:entity:list` 返回 `ok: true` 且 `items[0].aliases` 为字符串数组 |
| S2          | 同上                                                                      | `should accept aliases in knowledge entity create request payload`                 | `knowledge:entity:create` 入参含 `aliases` 时校验通过并返回 `ok: true`     |
| S3          | 同上                                                                      | `should accept aliases in knowledge entity update patch payload`                   | `knowledge:entity:update.patch.aliases` 入参通过 schema，返回 `ok: true`   |
| S4          | 同上                                                                      | `should reject non-array aliases with VALIDATION_ERROR on knowledge entity create` | `aliases` 为非数组时 `ok: false` 且 `error.code === "VALIDATION_ERROR"`    |

## 3. Red（先写失败测试）

- [x] 3.1 新建 `apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
- [x] 3.2 使用 `createValidatedIpcMain + registerKnowledgeGraphIpcHandlers` 构建最小复现链路
- [x] 3.3 编写 S1：先创建带 aliases 的实体，再调用 `knowledge:entity:list`，断言应为 `ok: true`
- [x] 3.4 编写 S2/S3：分别验证 create 与 update patch 接收 `aliases` payload
- [x] 3.5 编写 S4：验证 create 请求中 `aliases` 非数组时返回 `VALIDATION_ERROR`
- [x] 3.6 运行测试确认 Red（当前会在 response 校验阶段返回 `INTERNAL_ERROR`）

Red 失败证据要求：记录 `knowledge:entity:list` 返回 `ok: false` 且 `error.code === "INTERNAL_ERROR"`

## 4. Green（最小实现通过）

- [x] 4.1 修改 `ipc-contract.ts`：`KG_ENTITY_SCHEMA` 增加 `aliases: s.array(s.string())`
- [x] 4.2 修改 `ipc-contract.ts`：`knowledge:entity:create.request` 增加 `aliases: s.optional(s.array(s.string()))`
- [x] 4.3 修改 `ipc-contract.ts`：`knowledge:entity:update.request.patch` 增加 `aliases: s.optional(s.array(s.string()))`
- [x] 4.4 修改 `knowledgeGraph.ts`：`EntityCreatePayload` 与 `EntityUpdatePayload.patch` 新增 `aliases?: string[]`
- [x] 4.5 运行 `pnpm contract:generate` 更新 `packages/shared/types/ipc-generated.ts`
- [x] 4.6 运行目标测试确认 Green

## 5. Refactor（保持绿灯）

- [x] 5.1 检查 KG 相关契约定义一致性（create/read/list/update/query 统一引用 `KG_ENTITY_SCHEMA`）
- [x] 5.2 清理测试中的重复建库/IPC harness 逻辑，抽成局部 helper 保持可读性
- [x] 5.3 执行回归验证，确保仍为绿灯

## 6. Evidence

- Red 命令：`pnpm tsx apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
- Red 结果：`AssertionError [ERR_ASSERTION]: false !== true`（触发点为 `knowledge:entity:list` 未返回 `ok: true`，并捕获 `error.code === "INTERNAL_ERROR"`）
- Green 命令：`pnpm tsx apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
- Green 结果：exit code 0
- 回归命令：`pnpm contract:check`、`pnpm -C apps/desktop typecheck`、`pnpm tsx apps/desktop/tests/integration/kg/relation-delete.test.ts`
- 回归结果：全部 exit code 0
- PR: <Codex 回填>

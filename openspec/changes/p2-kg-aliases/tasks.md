## 1. Specification

- [ ] 1.1 审阅 `openspec/specs/knowledge-graph/spec.md` §实体管理，确认当前 `KnowledgeEntity` 字段列表无 `aliases` 字段
- [ ] 1.2 审阅 `apps/desktop/main/src/services/kg/kgService.ts` L47-57 确认 `KnowledgeEntity` 类型无 `aliases`
- [ ] 1.3 确认 SQLite JSON 存储策略：列类型 `TEXT`，读取时 `JSON.parse`，写入时 `JSON.stringify`；parse 失败回退空数组
- [ ] 1.4 依赖同步检查（Dependency Sync Check）: N/A（无上游依赖）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                | 测试用例名                                 | 断言要点                                                       |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts` | `should default aliases to empty array`    | `Array.isArray(entity.aliases) && entity.aliases.length === 0` |
| S2          | 同上                                                                    | `should store aliases when specified`      | `entity.aliases` deep equals `["小默", "默哥"]`                |
| S3          | 同上                                                                    | `should update aliases`                    | `updated.aliases` deep equals `["小默", "默哥", "林侦探"]`     |
| S4          | 同上                                                                    | `should reject non-array aliases`          | `result.ok === false && error.code === "VALIDATION_ERROR"`     |
| S5          | 同上                                                                    | `should filter empty strings from aliases` | `entity.aliases` deep equals `["小默"]`                        |

## 3. Red（先写失败测试）

- [ ] 3.1 创建 `apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
- [ ] 3.2 编写 S1 测试 `should default aliases to empty array` — `expect(entity.aliases).toEqual([])`
- [ ] 3.3 编写 S2 测试 `should store aliases when specified` — `expect(entity.aliases).toEqual(["小默", "默哥"])`
- [ ] 3.4 编写 S3 测试 `should update aliases` — `expect(updated.aliases).toEqual(["小默", "默哥", "林侦探"])`
- [ ] 3.5 编写 S4 测试 `should reject non-array aliases` — `expect(result.ok).toBe(false)`
- [ ] 3.6 编写 S5 测试 `should filter empty strings from aliases` — `expect(entity.aliases).toEqual(["小默"])`
- [ ] 3.7 运行测试确认全部 FAIL（`aliases` 属性不存在）

Red 失败证据要求：记录属性 undefined 或 JSON parse 错误

## 4. Green（最小实现通过）

- [ ] 4.1 在 `kgService.ts` 的 `KnowledgeEntity` 类型（L47）中添加 `aliases: string[]`
- [ ] 4.2 在 `EntityRow` 类型（L214）中添加 `aliasesJson: string` 字段
- [ ] 4.3 修改 `rowToEntity`（L451）：`JSON.parse(row.aliasesJson)` 映射到 `string[]`，parse 失败回退 `[]`
- [ ] 4.4 新增校验函数：输入为 `unknown`，校验 `Array.isArray`，过滤空白项（`s.trim() !== ""`），非数组返回 `VALIDATION_ERROR`
- [ ] 4.5 修改 `entityCreate`（L707）：新增可选参数 `aliases?: string[]`，不传时默认 `[]`；传入时校验 + 过滤空白 + `JSON.stringify` 存储
- [ ] 4.6 修改 INSERT SQL（L773）：增加 `aliases` 列
- [ ] 4.7 修改 `entityUpdate`（L863）：`patch` 参数新增 `aliases?: string[]`，传入时校验 + 过滤空白 + UPDATE `aliases` 列
- [ ] 4.8 修改所有 SELECT SQL 语句：增加 `aliases as aliasesJson` 列映射
- [ ] 4.9 添加 SQLite migration：`ALTER TABLE kg_entities ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]'`
- [ ] 4.10 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）

- [ ] 5.1 确认 `aliases` JSON 存储/读取的 parse 错误有 try-catch 保护（损坏数据回退空数组）
- [ ] 5.2 确认空白过滤逻辑统一在一个辅助函数中处理（`entityCreate` 和 `entityUpdate` 共用）
- [ ] 5.3 运行测试确认仍全部 PASS

## 6. Evidence

- 测试命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
- 测试结果：5 tests passed, exit code 0
- PR: <Codex 回填>

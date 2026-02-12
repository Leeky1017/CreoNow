## 1. Specification

- [ ] 1.1 审阅 `openspec/specs/knowledge-graph/spec.md` §实体管理，确认 `KnowledgeEntity` 当前字段列表（`id/projectId/type/name/description/attributes/version/createdAt/updatedAt`）不含 `aiContextLevel`
- [ ] 1.2 审阅 `apps/desktop/main/src/services/kg/kgService.ts` L47-57 的 `KnowledgeEntity` 类型定义，确认无 `aiContextLevel` 字段
- [ ] 1.3 确认需同步新增 Zod enum 校验：`z.enum(["always", "when_detected", "manual_only", "never"])`，无效值返回 `VALIDATION_ERROR`
- [ ] 1.4 Dependency Sync Check: N/A（无上游依赖）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                     | 测试用例名                                       | 断言要点                                                   |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts` | `should default aiContextLevel to when_detected` | `entity.aiContextLevel === "when_detected"`                |
| S2          | 同上                                                                         | `should update aiContextLevel to always`         | `updated.aiContextLevel === "always"`                      |
| S3          | 同上                                                                         | `should filter entities by aiContextLevel`       | `result.length === 1 && result[0].name === "A"`            |
| S4          | 同上                                                                         | `should reject invalid aiContextLevel`           | `result.ok === false && error.code === "VALIDATION_ERROR"` |

## 3. Red（先写失败测试）

- [ ] 3.1 创建 `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- [ ] 3.2 编写 S1 测试 `should default aiContextLevel to when_detected` — `expect(entity.aiContextLevel).toBe("when_detected")`
- [ ] 3.3 编写 S2 测试 `should update aiContextLevel to always` — `expect(updated.aiContextLevel).toBe("always")`
- [ ] 3.4 编写 S3 测试 `should filter entities by aiContextLevel` — `expect(result).toHaveLength(1)`
- [ ] 3.5 编写 S4 测试 `should reject invalid aiContextLevel` — `expect(result.ok).toBe(false)`
- [ ] 3.6 运行测试确认全部 FAIL（`aiContextLevel` 属性不存在）

Red 失败证据要求：记录 `TypeError` 或属性 undefined 错误

## 4. Green（最小实现通过）

- [ ] 4.1 在 `kgService.ts` 的 `KnowledgeEntity` 类型（L47）中添加 `aiContextLevel: AiContextLevel` 字段
- [ ] 4.2 定义并导出 `AiContextLevel = "always" | "when_detected" | "manual_only" | "never"` 类型和 `AI_CONTEXT_LEVELS` 常量数组
- [ ] 4.3 在 `EntityRow` 类型（L214）中添加 `aiContextLevel: string` 字段
- [ ] 4.4 修改 `rowToEntity`（L451）：从 `row.aiContextLevel`（mapped from `ai_context_level`）映射到 `entity.aiContextLevel`，无效值回退 `"when_detected"`
- [ ] 4.5 修改 `entityCreate` 方法（L707）：新增可选参数 `aiContextLevel?: AiContextLevel`，不传时默认 `"when_detected"`；传入时校验是否在 `AI_CONTEXT_LEVELS` 中，无效值返回 `VALIDATION_ERROR`
- [ ] 4.6 修改 INSERT SQL（L773）：增加 `ai_context_level` 列
- [ ] 4.7 修改 `entityUpdate` 方法（L863）：`patch` 参数新增 `aiContextLevel?: AiContextLevel`，传入时校验并 UPDATE `ai_context_level` 列
- [ ] 4.8 修改 `entityList` 方法（L836）：新增可选参数 `filter?: { aiContextLevel?: AiContextLevel }`，传入时生成 `WHERE ai_context_level = ?` SQL 条件
- [ ] 4.9 修改所有 SELECT SQL 语句：增加 `ai_context_level as aiContextLevel` 列映射
- [ ] 4.10 添加 SQLite migration：`ALTER TABLE kg_entities ADD COLUMN ai_context_level TEXT NOT NULL DEFAULT 'when_detected'`
- [ ] 4.11 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）

- [ ] 5.1 确认 `AiContextLevel` 类型和 `AI_CONTEXT_LEVELS` 常量从 `kgService.ts` 正确导出（C10/C11/C12 需引用）
- [ ] 5.2 确认校验逻辑统一使用 `AI_CONTEXT_LEVELS.includes()` 而非硬编码字符串
- [ ] 5.3 运行测试确认仍全部 PASS

## 6. Evidence

- 测试命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- 测试结果：4 tests passed, exit code 0
- PR: <Codex 回填>

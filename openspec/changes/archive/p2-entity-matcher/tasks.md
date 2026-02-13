## 1. Specification

- [x] 1.1 审阅 C8 delta spec 确认 `AiContextLevel` 类型定义为 `"always" | "when_detected" | "manual_only" | "never"`
- [x] 1.2 审阅 C9 delta spec 确认 `aliases: string[]` 字段定义
- [x] 1.3 确认 `kgRecognitionRuntime.ts` 为当前 LLM-based 异步识别模块，`matchEntities` 是新增的同步纯函数，二者互补
- [x] 1.4 依赖同步检查（Dependency Sync Check）: 核对 C8 `AiContextLevel` 类型和 C9 `aliases` 字段 → `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                            | 测试用例名                                     | 断言要点                                         |
| ----------- | ------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| S1          | `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts` | `should match entities by name`                | `results.length === 2`，包含 e1 和 e2            |
| S2          | 同上                                                                | `should match entities by alias`               | `result[0].matchedTerm === "小默"`               |
| S3          | 同上                                                                | `should skip non-when_detected entities`       | `results.length === 0`                           |
| S4          | 同上                                                                | `should deduplicate by entityId`               | `results.length === 1`，`matchedTerm === "林默"` |
| S5          | 同上                                                                | `should return empty for empty text`           | `results.length === 0`                           |
| S6          | 同上                                                                | `should complete within 10ms for 100 entities` | `elapsed < 10`                                   |

## 3. Red（先写失败测试）

- [x] 3.1 创建 `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- [x] 3.2 编写 S1 测试 `should match entities by name` — 构造 2 个 `when_detected` 实体，text 包含两个名字，`expect(results).toHaveLength(2)`
- [x] 3.3 编写 S2 测试 `should match entities by alias` — 实体 `name` 不在 text 中但 alias 在，`expect(results[0].matchedTerm).toBe("小默")`
- [x] 3.4 编写 S3 测试 `should skip non-when_detected entities` — 3 个实体分别为 `always/never/manual_only`，`expect(results).toHaveLength(0)`
- [x] 3.5 编写 S4 测试 `should deduplicate by entityId` — 实体 `name` 和 `alias` 都出现在 text 中，`expect(results).toHaveLength(1)`，`expect(results[0].matchedTerm).toBe("林默")`
- [x] 3.6 编写 S5 测试 `should return empty for empty text` — `expect(matchEntities("", entities)).toEqual([])`
- [x] 3.7 编写 S6 测试 `should complete within 10ms for 100 entities` — 生成 100 实体 × 1000 字，`expect(elapsed).toBeLessThan(10)`
- [x] 3.8 运行测试确认全部 FAIL（`matchEntities` 函数不存在）

Red 失败证据要求：`Error: Cannot find module` 或 `matchEntities is not a function`

## 4. Green（最小实现通过）

- [x] 4.1 创建 `apps/desktop/main/src/services/kg/entityMatcher.ts`
- [x] 4.2 导出 `MatchableEntity` 和 `MatchResult` 类型
- [x] 4.3 实现 `matchEntities(text, entities)` 函数：
  - 若 `text` 为空返回 `[]`
  - 若 `entities` 为空返回 `[]`
  - 过滤 `aiContextLevel !== "when_detected"` 的实体
  - 对每个实体，检查 `text.includes(name)` 和遍历 `aliases` 检查 `text.includes(alias)`
  - 找到第一个匹配的 term（优先 `name`）记录 `position`（`text.indexOf(term)`）
  - 按 `entityId` 去重（`Map<string, MatchResult>`）
  - 返回 `MatchResult[]`
- [x] 4.4 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）

- [x] 5.1 评估是否需要 Aho-Corasick 优化（当前朴素扫描对 100 实体足够，暂不优化）
- [x] 5.2 确认函数为纯函数，无副作用，无 IO
- [x] 5.3 运行测试确认仍全部 PASS

## 6. Evidence

- 测试命令：`pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- 测试结果：6 tests passed, exit code 0
- PR: <Codex 回填>

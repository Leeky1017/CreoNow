## 1. Specification

- [ ] 1.1 审阅 `apps/desktop/main/src/services/context/layerAssemblyService.ts` 的 `defaultFetchers()`（L1086-1088）→ retrieved fetcher 当前返回空 chunks
- [ ] 1.2 审阅 C10 delta spec 确认 `matchEntities` 函数签名：`matchEntities(text: string, entities: MatchableEntity[]): MatchResult[]`
- [ ] 1.3 审阅 C11 确认 `formatEntityForContext(entity)` 已抽取为独立导出函数
- [ ] 1.4 Dependency Sync Check: 核对 C10 `matchEntities` 签名 + C8 `entityList({ filter })` + C11 `formatEntityForContext` → `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                    | 测试用例名                                                 | 断言要点                                                   |
| ----------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts` | `should inject detected entities into retrieved layer`     | `chunks[0].source` 包含 `codex:detected`，内容包含实体详情 |
| S2          | 同上                                                                        | `should return empty when no entities matched`             | `chunks.length === 0`                                      |
| S3          | 同上                                                                        | `should skip detection when additionalInput is empty`      | `chunks.length === 0`，`matchEntities` 未被调用            |
| S4          | 同上                                                                        | `should degrade with KG_UNAVAILABLE on kg error`           | `warnings[0]` 包含 `KG_UNAVAILABLE`                        |
| S5          | 同上                                                                        | `should degrade with ENTITY_MATCH_FAILED on matcher error` | `warnings[0]` 包含 `ENTITY_MATCH_FAILED`                   |

## 3. Red（先写失败测试）

- [ ] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
- [ ] 3.2 mock `kgService.entityList` 和 `matchEntities`
- [ ] 3.3 编写 S1 测试 `should inject detected entities into retrieved layer`：
  - mock `entityList` 返回 1 个 `when_detected` 实体（含完整字段）
  - mock `matchEntities` 返回 `[{ entityId: "e1", matchedTerm: "小雨", position: 0 }]`
  - `expect(result.chunks[0].source).toContain("codex:detected")`
  - `expect(result.chunks[0].content).toContain("林小雨")`
- [ ] 3.4 编写 S2 测试 `should return empty when no entities matched` — mock `matchEntities` 返回 `[]`，`expect(result.chunks).toEqual([])`
- [ ] 3.5 编写 S3 测试 `should skip detection when additionalInput is empty` — `request.additionalInput = ""`，`expect(mockMatchEntities).not.toHaveBeenCalled()`
- [ ] 3.6 编写 S4 测试 `should degrade with KG_UNAVAILABLE on kg error` — mock `entityList` 抛出异常，`expect(result.warnings![0]).toContain("KG_UNAVAILABLE")`
- [ ] 3.7 编写 S5 测试 `should degrade with ENTITY_MATCH_FAILED on matcher error` — mock `matchEntities` 抛出异常，`expect(result.warnings![0]).toContain("ENTITY_MATCH_FAILED")`
- [ ] 3.8 运行测试确认全部 FAIL（`createRetrievedFetcher` 函数不存在或 retrieved fetcher 仍为桩实现）

Red 失败证据要求：`Error: Cannot find module` 或断言失败——桩返回空 chunks 而非 Codex 检测结果

## 4. Green（最小实现通过）

- [ ] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`
- [ ] 4.2 实现 `createRetrievedFetcher(deps: { kgService, matchEntities })` 工厂函数，返回 `ContextLayerFetcher`
- [ ] 4.3 fetcher 内部逻辑：
  - 若 `request.additionalInput` 为空/undefined，直接返回 `{ chunks: [] }`
  - try: 调用 `kgService.entityList({ projectId, filter: { aiContextLevel: "when_detected" } })`
    - 若 `ok: false` 或抛出异常 → 返回 `{ chunks: [], warnings: ["KG_UNAVAILABLE: 知识图谱数据未注入"] }`
  - 将实体映射为 `MatchableEntity[]`（取 `id/name/aliases/aiContextLevel`）
  - try: 调用 `matchEntities(text, matchableEntities)`
    - 若抛出异常 → 返回 `{ chunks: [], warnings: ["ENTITY_MATCH_FAILED: 实体匹配异常"] }`
  - 对每个匹配结果，从实体列表中找到完整实体，用 `formatEntityForContext` 格式化为 chunk，`source` 为 `"codex:detected:<entityId>"`
- [ ] 4.4 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`（L1086），将 retrieved 位替换为 `createRetrievedFetcher`（或保留为可注入参数）
- [ ] 4.5 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）

- [ ] 5.1 确认与 C11 `rulesFetcher` 共用 `formatEntityForContext`（不重复实现）
- [ ] 5.2 确认两层 try-catch 各自产出不同 warning code（`KG_UNAVAILABLE` vs `ENTITY_MATCH_FAILED`）
- [ ] 5.3 运行测试确认仍全部 PASS

## 6. Evidence

- 测试命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
- 测试结果：5 tests passed, exit code 0
- PR: <Codex 回填>

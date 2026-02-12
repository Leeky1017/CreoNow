## 1. Specification

- [ ] 1.1 审阅 `apps/desktop/main/src/services/context/layerAssemblyService.ts` 的 `defaultFetchers()`（L1073-1098）→ rules fetcher 当前返回硬编码桩字符串
- [ ] 1.2 审阅 C8 delta spec 确认 `entityList` 支持 `filter.aiContextLevel` 参数，返回 `ServiceResult<{ items: KnowledgeEntity[] }>`
- [ ] 1.3 确认 `ContextLayerFetcher` 函数签名（L52-54）和 `ContextLayerFetchResult` 返回类型（L46-50）
- [ ] 1.4 依赖同步检查（Dependency Sync Check）: 核对 C8 `entityList({ filter: { aiContextLevel: "always" } })` 接口 → `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                | 测试用例名                                                | 断言要点                                                   |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts` | `should inject always entities into rules layer`          | `chunks.length >= 2`，内容包含实体名和描述                 |
| S2          | 同上                                                                    | `should return empty chunks when no always entities`      | `chunks.length === 0`，无 warning                          |
| S3          | 同上                                                                    | `should degrade with KG_UNAVAILABLE warning on error`     | `chunks.length === 0`，`warnings[0]` 包含 `KG_UNAVAILABLE` |
| S4          | 同上                                                                    | `should format entity with type, description, attributes` | 输出包含 `## 角色：林默` 和 `age=28`                       |

## 3. Red（先写失败测试）

- [ ] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
- [ ] 3.2 mock `kgService.entityList` 返回 2 个 always 实体（含 `name/type/description/attributes/aiContextLevel/id/projectId/version/createdAt/updatedAt/aliases`）
- [ ] 3.3 编写 S1 测试 `should inject always entities into rules layer`：
  - `expect(result.chunks.length).toBeGreaterThanOrEqual(2)`
  - `expect(result.chunks[0].content).toContain("林默")`
  - `expect(result.chunks[0].source).toContain("kg:always:")`
- [ ] 3.4 编写 S2 测试 `should return empty chunks when no always entities` — mock 返回空数组，`expect(result.chunks).toEqual([])`
- [ ] 3.5 编写 S3 测试 `should degrade with KG_UNAVAILABLE warning on error` — mock 抛出异常，`expect(result.warnings![0]).toContain("KG_UNAVAILABLE")`
- [ ] 3.6 编写 S4 测试 `should format entity with type, description, attributes`：
  - `expect(content).toContain("## 角色：林默")`
  - `expect(content).toContain("age=28")`
  - `expect(content).toContain("skill=推理")`
- [ ] 3.7 运行测试确认全部 FAIL（`createRulesFetcher` 函数不存在或 rules fetcher 仍为桩实现）

Red 失败证据要求：`Error: Cannot find module` 或断言失败——桩返回硬编码字符串而非 KG 实体

## 4. Green（最小实现通过）

- [ ] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`
- [ ] 4.2 实现 `createRulesFetcher(deps: { kgService })` 工厂函数，返回 `ContextLayerFetcher`
- [ ] 4.3 fetcher 内部逻辑：
  - 调用 `kgService.entityList({ projectId: request.projectId, filter: { aiContextLevel: "always" } })`
  - 如果返回 `ok: false` 或抛出异常，返回 `{ chunks: [], warnings: ["KG_UNAVAILABLE: 知识图谱数据未注入"] }`
  - 格式化每个实体为结构化文本 chunk（`formatEntityForContext` 辅助函数），source 为 `"kg:always:<entityId>"`
- [ ] 4.4 实现并导出 `formatEntityForContext(entity)` — 输出 `## <类型中文>：<name>\n- 类型：<type>\n- 描述：<description>\n- 属性：<key=value, ...>`
- [ ] 4.5 定义实体类型中文映射：`{ character: "角色", location: "地点", event: "事件", item: "物品", faction: "阵营" }`
- [ ] 4.6 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`（L1073），将 rules 位替换为 `createRulesFetcher`（或保留为可注入参数）
- [ ] 4.7 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）

- [ ] 5.1 将 `formatEntityForContext` 确认为独立导出函数（C12 retrieved fetcher 将复用）
- [ ] 5.2 确认 fetcher 工厂函数使用显式依赖注入（`deps: { kgService }`，不 import 全局单例）
- [ ] 5.3 运行测试确认仍全部 PASS

## 6. Evidence

- 测试命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
- 测试结果：4 tests passed, exit code 0
- PR: <Codex 回填>

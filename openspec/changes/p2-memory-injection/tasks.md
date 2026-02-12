## 1. Specification

- [ ] 1.1 审阅 `apps/desktop/main/src/services/context/layerAssemblyService.ts` 的 `defaultFetchers()`（L1083-1085）→ settings fetcher 当前返回空 chunks
- [ ] 1.2 审阅 `apps/desktop/main/src/services/memory/memoryService.ts` L90-94 确认 `previewInjection` 方法签名：`(args: { projectId?, documentId?, queryText? }) => ServiceResult<MemoryInjectionPreview>`
- [ ] 1.3 审阅 `memoryService.ts` L52-56 确认 `MemoryInjectionPreview` 返回类型：`{ items: MemoryInjectionItem[], mode: MemoryInjectionMode, diagnostics?: { degradedFrom: "semantic", reason: string } }`
- [ ] 1.4 Dependency Sync Check: 核对 `memoryService.previewInjection` 签名和返回类型 → `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                   | 测试用例名                                              | 断言要点                                                          |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts` | `should inject memory items into settings layer`        | `chunks[0].content` 包含偏好文本，`source === "memory:injection"` |
| S2          | 同上                                                                       | `should return empty chunks when no memory items`       | `chunks.length === 0`，无 warning                                 |
| S3          | 同上                                                                       | `should degrade with MEMORY_UNAVAILABLE on error`       | `warnings[0]` 包含 `MEMORY_UNAVAILABLE`                           |
| S4          | 同上                                                                       | `should report MEMORY_DEGRADED on semantic degradation` | `warnings` 包含 `MEMORY_DEGRADED`                                 |
| S5          | 同上                                                                       | `should include origin in formatted output`             | 输出包含 `自动学习` 或 `learned`                                  |

## 3. Red（先写失败测试）

- [ ] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- [ ] 3.2 mock `memoryService.previewInjection`
- [ ] 3.3 编写 S1 测试 `should inject memory items into settings layer`：
  - mock 返回 2 条 items（一条 `learned`，一条 `manual`）
  - `expect(result.chunks[0].content).toContain("动作场景偏好短句")`
  - `expect(result.chunks[0].source).toBe("memory:injection")`
- [ ] 3.4 编写 S2 测试 `should return empty chunks when no memory items` — mock 返回 `{ ok: true, data: { items: [], mode: "deterministic" } }`，`expect(result.chunks).toEqual([])`
- [ ] 3.5 编写 S3 测试 `should degrade with MEMORY_UNAVAILABLE on error` — mock 抛出异常，`expect(result.warnings![0]).toContain("MEMORY_UNAVAILABLE")`
- [ ] 3.6 编写 S4 测试 `should report MEMORY_DEGRADED on semantic degradation` — mock 返回 `diagnostics: { degradedFrom: "semantic", reason: "embedding service unavailable" }`，`expect(result.warnings).toContainEqual(expect.stringContaining("MEMORY_DEGRADED"))`
- [ ] 3.7 编写 S5 测试 `should include origin in formatted output` — `expect(content).toMatch(/自动学习|learned/)`
- [ ] 3.8 运行测试确认全部 FAIL（`createSettingsFetcher` 函数不存在或 settings fetcher 仍为桩实现）

Red 失败证据要求：`Error: Cannot find module` 或断言失败——桩返回空 chunks 而非记忆注入内容

## 4. Green（最小实现通过）

- [ ] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`
- [ ] 4.2 实现 `createSettingsFetcher(deps: { memoryService })` 工厂函数，返回 `ContextLayerFetcher`
- [ ] 4.3 fetcher 内部逻辑：
  - try: 调用 `memoryService.previewInjection({ projectId: request.projectId, documentId: request.documentId })`
    - 若 `ok: false` 或抛出异常 → 返回 `{ chunks: [], warnings: ["MEMORY_UNAVAILABLE: 记忆数据未注入"] }`
  - 如果 items 为空 → 返回 `{ chunks: [] }`
  - 格式化 items 为单个 chunk：`[用户写作偏好 — 记忆注入]\n` + 每条 item `- <content>（来源：<origin 中文映射>）\n`
  - chunk `source` 为 `"memory:injection"`
  - 如果 `diagnostics?.degradedFrom` 存在 → warnings 中添加 `"MEMORY_DEGRADED: <reason>"`
- [ ] 4.4 定义 origin 中文映射：`{ learned: "自动学习", manual: "手动添加" }`
- [ ] 4.5 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`（L1083），将 settings 位替换为 `createSettingsFetcher`（或保留为可注入参数）
- [ ] 4.6 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）

- [ ] 5.1 确认 fetcher 工厂函数使用显式依赖注入（`deps: { memoryService }`，不 import 全局单例）
- [ ] 5.2 确认格式化输出中 origin 的中文映射统一在一处定义（`ORIGIN_LABEL_MAP`）
- [ ] 5.3 运行测试确认仍全部 PASS

## 6. Evidence

- 测试命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- 测试结果：5 tests passed, exit code 0
- PR: <Codex 回填>

## 1. Specification

- [x] 1.1 审阅 `apps/desktop/main/src/services/context/layerAssemblyService.ts` 的 `defaultFetchers()`（原 L1096-L1098）→ settings fetcher 返回空 chunks。
- [x] 1.2 审阅 `apps/desktop/main/src/services/memory/memoryService.ts` L90-L94，确认 `previewInjection` 方法签名。
- [x] 1.3 审阅 `apps/desktop/main/src/services/memory/memoryService.ts` L52-L56，确认 `MemoryInjectionPreview` 返回类型。
- [x] 1.4 依赖同步检查（Dependency Sync Check）完成：核对 `previewInjection` 签名/返回结构/错误码映射，结论 `NO_DRIFT`。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 已设置门禁：先执行 Red（缺失模块失败）后再进入 Green。

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                   | 测试用例名                                              | 断言要点                                                          |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts` | `should inject memory items into settings layer`        | `chunks[0].content` 包含偏好文本，`source === "memory:injection"` |
| S2          | 同上                                                                       | `should return empty chunks when no memory items`       | `chunks.length === 0`，无 warning                                 |
| S3          | 同上                                                                       | `should degrade with MEMORY_UNAVAILABLE on error`       | `warnings[0]` 包含 `MEMORY_UNAVAILABLE`                           |
| S4          | 同上                                                                       | `should report MEMORY_DEGRADED on semantic degradation` | `warnings` 包含 `MEMORY_DEGRADED`                                 |
| S5          | 同上                                                                       | `should include origin in formatted output`             | 输出包含 `自动学习` 或 `learned`                                  |

## 3. Red（先写失败测试）

- [x] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`。
- [x] 3.2 使用 `vi.fn` mock `memoryService.previewInjection`。
- [x] 3.3 编写 S1 测试 `should inject memory items into settings layer`。
- [x] 3.4 编写 S2 测试 `should return empty chunks when no memory items`。
- [x] 3.5 编写 S3 测试 `should degrade with MEMORY_UNAVAILABLE on error`。
- [x] 3.6 编写 S4 测试 `should report MEMORY_DEGRADED on semantic degradation`。
- [x] 3.7 编写 S5 测试 `should include origin in formatted output`。
- [x] 3.8 运行测试确认 FAIL（`createSettingsFetcher` 模块不存在）。

Red 失败证据：

```bash
$ ./apps/desktop/node_modules/.bin/vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts
Error: Cannot find module '../fetchers/settingsFetcher'
```

## 4. Green（最小实现通过）

- [x] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`。
- [x] 4.2 实现 `createSettingsFetcher(deps: { memoryService })` 工厂函数，返回 `ContextLayerFetcher`。
- [x] 4.3 实现 fetcher 逻辑：`previewInjection` 成功注入、空列表返回空 chunks、失败降级 `MEMORY_UNAVAILABLE`、语义降级追加 `MEMORY_DEGRADED`。
- [x] 4.4 定义 origin 中文映射：`{ learned: "自动学习", manual: "手动添加" }`。
- [x] 4.5 修改 `layerAssemblyService.ts` `defaultFetchers()`，将 settings 位替换为 `createSettingsFetcher`（通过依赖注入传入 `memoryService`）。
- [x] 4.6 运行测试确认全部 PASS。

## 5. Refactor（保持绿灯）

- [x] 5.1 确认 fetcher 使用显式依赖注入（`deps: { memoryService }`）。
- [x] 5.2 确认 origin 中文映射统一在 `ORIGIN_LABEL_MAP` 一处定义。
- [x] 5.3 运行目标测试 + 关键 context 回归 + `apps/desktop` typecheck，结果保持全绿。

## 6. Evidence

- Red 测试命令：`./apps/desktop/node_modules/.bin/vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- Red 结果：FAIL（`Cannot find module '../fetchers/settingsFetcher'`）
- Green 测试命令：`./apps/desktop/node_modules/.bin/vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- Green 结果：`5 passed, 0 failed`
- 回归命令：
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-assembly-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-assemble-contract.test.ts`
  - `pnpm -C apps/desktop typecheck`
- 回归结果：全部 exit code 0
- PR: `待回填（由交付脚本自动更新）`

## 1. Specification

- [x] 1.1 审阅并确认需求边界：`GLOBAL_IDENTITY_PROMPT` 为字符串常量，包含 5 个 XML 区块
- [x] 1.2 审阅并确认错误路径与边界路径：常量导出无错误路径，仅验证内容完整性
- [x] 1.3 审阅并确认验收阈值与不可变契约：5 个 XML 区块标签对必须完整闭合；写作素养包含 Show don't tell；角色流动包含 5 个角色名
- [x] 1.4 无上游依赖，标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系（S1/S2/S3 显式命名）
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                             | 测试用例名                                               | 断言要点                                                                                     |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts` | `should be a string containing all five XML block pairs` | `expect(GLOBAL_IDENTITY_PROMPT).toContain("<identity>")` 等 5 对标签                         |
| S2          | `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts` | `should include writing awareness core concepts`         | 提取 `<writing_awareness>` 内容，断言包含 "Show don't tell"、"blocking"/"场景"、"POV"/"叙事" |
| S3          | `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts` | `should define five roles in role_fluidity block`        | 提取 `<role_fluidity>` 内容，断言包含 ghostwriter/muse/editor/actor/painter                  |

## 3. Red（先写失败测试）

- [x] 3.1 先修改 `identityPrompt.test.ts`：按 XML 区块提取后校验 S1/S2/S3，并新增 S2 对 `narrative structure` 的断言
- [x] 3.2 执行失败测试，确认失败原因为缺失写作素养术语（非语法/路径错误）

```bash
$ npx tsx apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts
Error: S2 should include writing awareness core concepts failed
[cause]: AssertionError [ERR_ASSERTION]: writing_awareness must mention narrative structure
```

Red 结论：失败与需求缺口一致，可进入 Green。

## 4. Green（最小实现通过）

- [x] 4.1 最小实现：仅修改 `identityPrompt.ts` 的 `<writing_awareness>` 区块，补入 `narrative structure` 与 `characterization`
- [x] 4.2 重新执行测试并回归通过

```bash
$ npx tsx apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts && \
  npx tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts
```

Green 结论：目标测试通过，且未引入 `assembleSystemPrompt` 回归。

## 5. Refactor（保持绿灯）

- [x] 5.1 将测试抽取为 `getXmlBlockContent` + `runCase`，减少重复并增强失败定位信息
- [x] 5.2 保持行为不扩散：未改动 `combineSystemText` 与其它调用链，仅维护本 change 契约

## 6. Evidence

- [x] 6.1 OPEN Issue：`#468`（替代已关闭 `#456`）
- [x] 6.2 Rulebook task：`rulebook/tasks/issue-468-p1-identity-template/`
- [x] 6.3 RUN_LOG：`openspec/_ops/task_runs/ISSUE-468.md`
- [x] 6.4 关键命令输出已落盘（Red / Green / validate / preflight）

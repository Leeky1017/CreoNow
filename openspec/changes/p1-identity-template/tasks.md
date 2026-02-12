## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`GLOBAL_IDENTITY_PROMPT` 为字符串常量，包含 5 个 XML 区块
- [ ] 1.2 审阅并确认错误路径与边界路径：常量导出无错误路径，仅验证内容完整性
- [ ] 1.3 审阅并确认验收阈值与不可变契约：5 个 XML 区块标签对必须完整闭合；写作素养包含 Show don't tell；角色流动包含 5 个角色名
- [ ] 1.4 无上游依赖，标注 N/A

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1 | `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts` | `should be a string containing all five XML block pairs` | `expect(GLOBAL_IDENTITY_PROMPT).toContain("<identity>")` 等 5 对标签 |
| S2 | `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts` | `should include writing awareness core concepts` | 提取 `<writing_awareness>` 内容，断言包含 "Show don't tell"、"blocking"/"场景"、"POV"/"叙事" |
| S3 | `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts` | `should define five roles in role_fluidity block` | 提取 `<role_fluidity>` 内容，断言包含 ghostwriter/muse/editor/actor/painter |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->

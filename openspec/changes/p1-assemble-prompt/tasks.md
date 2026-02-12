## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`assembleSystemPrompt` 接受 6 层参数，`globalIdentity` 为必选，其余可选
- [ ] 1.2 审阅并确认错误路径与边界路径：空白字符串层被 `.trim()` 过滤；`globalIdentity` 为空字符串时仍作为首层输出
- [ ] 1.3 审阅并确认验收阈值与不可变契约：6 层固定顺序不可变，各层以 `\n\n` 分隔
- [ ] 1.4 上游依赖 `p1-identity-template`，Dependency Sync Check 结论：`NO_DRIFT`（`GLOBAL_IDENTITY_PROMPT` 为 string 常量）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1 | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should assemble all six layers in correct order` | `indexOf("<identity>") < indexOf("规则") < indexOf("续写助手") < indexOf("Mode: agent") < indexOf("简洁风格") < indexOf("林默")` |
| S2 | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should return only identity when optional layers are undefined` | `expect(result).toBe("<identity>AI</identity>")` |
| S3 | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should skip whitespace-only layers` | `expect(result).toBe("<identity>AI</identity>")`，不含 `\n\n\n\n` |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->

## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`buildLLMMessages` 接受 `{systemPrompt, history, currentUserMessage, maxTokenBudget}`，返回 `LLMMessage[]`
- [ ] 1.2 审阅并确认错误路径与边界路径：空历史 → 仅 system + current；预算极小 → 强制保留 system + current，裁掉全部历史
- [ ] 1.3 审阅并确认验收阈值与不可变契约：system 永远保留；current 永远保留；历史从旧到新裁剪；token 估算为 `Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4))`
- [ ] 1.4 上游依赖 `p1-assemble-prompt` 和 `p1-aistore-messages`，Dependency Sync Check 结论：`NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1 | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should assemble system + history + current in order` | `result.length === 4`，顺序验证 |
| S2 | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should trim oldest history when over token budget` | 最早消息被裁掉，最后一条为 current |
| S3 | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should return system + current when history is empty` | `result.length === 2` |
| S4 | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should force-retain system + current even when budget is tight` | system 和 current 存在，历史被裁剪 |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->

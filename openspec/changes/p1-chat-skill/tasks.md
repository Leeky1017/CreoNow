## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`inferSkillFromInput` 接受 `{input, hasSelection, explicitSkillId?}`，返回技能 ID 字符串
- [ ] 1.2 审阅并确认错误路径与边界路径：空输入 → chat；显式覆盖优先；选中文本启发式优先于关键词
- [ ] 1.3 审阅并确认验收阈值与不可变契约：路由优先级固定为 显式 > 选中上下文 > 关键词 > 默认 chat
- [ ] 1.4 无上游依赖，标注 N/A

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should route unmatched input to builtin:chat` | `expect(result).toBe("builtin:chat")` |
| S2 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should route "续写" keywords to builtin:continue` | `expect(result).toBe("builtin:continue")` |
| S3 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should route "头脑风暴" keywords to builtin:brainstorm` | `expect(result).toBe("builtin:brainstorm")` |
| S4 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should route empty input to builtin:chat` | `expect(result).toBe("builtin:chat")` |
| S5 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should prefer explicit skill override` | `expect(result).toBe("builtin:polish")` |
| S6 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should route selection + empty input to builtin:polish` | `expect(result).toBe("builtin:polish")` |
| S7 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `should route selection + short rewrite keyword to builtin:rewrite` | `expect(result).toBe("builtin:rewrite")` |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->

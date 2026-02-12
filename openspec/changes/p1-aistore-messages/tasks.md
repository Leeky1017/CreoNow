## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`ChatMessageManager` 提供 `add`/`clear`/`getMessages` 三个操作；`ChatMessage` 类型包含 `id`/`role`/`content`/`timestamp` 必选字段和 `skillId`/`metadata` 可选字段
- [ ] 1.2 审阅并确认错误路径与边界路径：`getMessages` 返回防御性浅拷贝；`clear` 后再 `getMessages` 返回空数组
- [ ] 1.3 审阅并确认验收阈值与不可变契约：消息按添加顺序（时间序）存储；外部修改返回值不影响内部状态
- [ ] 1.4 上游依赖 `p1-assemble-prompt`，Dependency Sync Check 结论：`NO_DRIFT`（消息管理独立于 prompt 组装）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1 | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `should add a message and retrieve it` | `expect(msgs[0].role).toBe("user")`, `expect(msgs[0].content).toBe("你好")` |
| S2 | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `should preserve insertion order` | `expect(msgs[0].content).toBe("A")`, `expect(msgs[1].content).toBe("B")` |
| S3 | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `should clear all messages` | `expect(msgs.length).toBe(0)` |
| S4 | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `should return defensive copy preventing external mutation` | 修改返回值后重新获取，断言原值不变 |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->

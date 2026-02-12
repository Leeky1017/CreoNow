## 1. Specification

- [x] 1.1 审阅并确认需求边界：`buildLLMMessages` 接受 `{systemPrompt, history, currentUserMessage, maxTokenBudget}`，返回 `LLMMessage[]`
- [x] 1.2 审阅并确认错误路径与边界路径：空历史 → 仅 system + current；预算极小 → 强制保留 system + current，裁掉全部历史
- [x] 1.3 审阅并确认验收阈值与不可变契约：system 永远保留；current 永远保留；历史从旧到新裁剪；token 估算为 `Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4))`
- [x] 1.4 上游依赖 `p1-assemble-prompt` 和 `p1-aistore-messages`，已完成依赖同步检查（Dependency Sync Check）并落盘，结论：`NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                               | 测试用例名                                                       | 断言要点                           |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| S1          | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should assemble system + history + current in order`            | `result.length === 4`，顺序验证    |
| S2          | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should trim oldest history when over token budget`              | 最早消息被裁掉，最后一条为 current |
| S3          | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should return system + current when history is empty`           | `result.length === 2`              |
| S4          | `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts` | `should force-retain system + current even when budget is tight` | system 和 current 存在，历史被裁剪 |

## 3. Red（先写失败测试）

- [x] 3.1 复核历史 Red 证据：`buildLLMMessages` 首次引入前，目标测试因实现缺失失败（`ERR_MODULE_NOT_FOUND`）
- [x] 3.2 Red 失败来源已确认是能力缺口（模块不存在），非路径/环境噪声

```bash
$ npx tsx apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts
ERR_MODULE_NOT_FOUND: Cannot find module '../buildLLMMessages'
```

Red 证据来源：`openspec/_ops/task_runs/ISSUE-458.md`。

## 4. Green（最小实现通过）

- [x] 4.1 现态复核：`buildLLMMessages` 与 `estimateMessageTokens` 已满足 delta spec 契约
- [x] 4.2 执行目标测试与相邻回归，结果全通过

```bash
$ pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts && \
  echo "buildLLMMessages.test.ts PASS"
buildLLMMessages.test.ts PASS

$ pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts && \
  echo "chatMessageManager.test.ts PASS"
chatMessageManager.test.ts PASS
```

Green 结论：S1-S4 场景行为稳定，未引入回归。

## 5. Refactor（保持绿灯）

- [x] 5.1 本次收口不扩展行为、不引入新抽象；保持 `buildLLMMessages.ts` 现有最短实现链路
- [x] 5.2 仅补齐 change 文档证据与交付治理材料，维持测试绿灯

## 6. Evidence

- [x] 6.1 OPEN Issue：`#486`（不复用已关闭 `#458`）
- [x] 6.2 Rulebook task：`rulebook/tasks/issue-486-p1-multiturn-assembly/`
- [x] 6.3 RUN_LOG：`openspec/_ops/task_runs/ISSUE-486.md`
- [x] 6.4 门禁一致性核对：`gh api repos/Leeky1017/CreoNow/branches/main/protection --jq '.required_status_checks.contexts'` 输出 `"openspec-log-guard","ci","merge-serial"`

## 1. Specification

- [x] 1.1 审阅并确认未完成项边界（仅处理 p1p2-integration-check 的 G1~G5 + 错误码 + 主链路接入）
- [x] 1.2 审阅并确认错误路径与边界路径（缺 key、降级、stream done 收敛、多轮裁剪）
- [x] 1.3 审阅并确认验收阈值与不可变契约（IPC 契约、done 终态、mock-only CI）
- [x] 1.4 依赖同步检查（Dependency Sync Check）：N/A（当前无 active 上游 change）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将本 change Scenario 映射为测试用例（含 G1/G2/G3/G4/G5）
- [x] 2.2 建立 Scenario ID -> 测试文件/用例名可追踪映射
- [x] 2.3 设定门禁：未记录 Red 失败证据不得进入 Green

### Scenario -> Test 映射

| Scenario ID  | 测试文件                                                   | 计划用例名                                                                 |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| AIS-ERR-S1   | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `AIS-ERR-S1 missing api key should map to AI_PROVIDER_UNAVAILABLE`         |
| AIS-HISTORY-S1 | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `AIS-HISTORY-S1 should include previous turns in runtime request messages` |
| AIS-HISTORY-S2 | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `AIS-HISTORY-S2 should trim oldest history by token budget`                |
| G1           | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `G1 should complete skill run -> context assemble -> LLM(mock) -> stream`  |
| G2           | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `G2 should reflect KG updates in subsequent runtime context`               |
| G3           | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `G3 should consume persisted API key in upstream authorization`            |
| G5           | `apps/desktop/tests/integration/ai-skill-context-integration.test.ts` | `G5 should keep AI available when KG+Memory are unavailable`               |

## 3. Red（先写失败测试）

- [x] 3.1 编写并运行 AIS-ERR-S1 / AIS-HISTORY-S1 失败测试，记录失败输出
- [x] 3.2 编写并运行 AIS-HISTORY-S2 / G1 失败测试，记录失败输出
- [x] 3.3 编写并运行 G2 / G3 / G5 用例，纳入 Red->Green 回归矩阵

## 4. Green（最小实现通过）

- [x] 4.1 最小改动接入 `buildLLMMessages` + `chatMessageManager` 主链路
- [x] 4.2 统一缺 key 错误码语义并保持已有可用路径不回归
- [x] 4.3 使新增 Red 用例转绿，并完成相关回归

## 5. Refactor（保持绿灯）

- [x] 5.1 清理重复逻辑（消息组装/会话键/历史写入），不扩展新能力
- [x] 5.2 维持契约兼容（IPC 返回结构、stream done 收敛）

## 6. Evidence

- [x] 6.1 更新 `openspec/_ops/task_runs/ISSUE-513.md`，记录 Red/Green 与关键命令输出
- [x] 6.2 记录全量验证证据（unit/integration/typecheck/contract/cross-module）

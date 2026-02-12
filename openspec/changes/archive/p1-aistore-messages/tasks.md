## 1. Specification

- [x] 1.1 审阅并确认需求边界：`ChatMessageManager` 提供 `add`/`clear`/`getMessages` 三个操作；`ChatMessage` 类型包含 `id`/`role`/`content`/`timestamp` 必选字段和 `skillId`/`metadata` 可选字段
- [x] 1.2 审阅并确认错误路径与边界路径：`getMessages` 返回防御性浅拷贝；`clear` 后再 `getMessages` 返回空数组
- [x] 1.3 审阅并确认验收阈值与不可变契约：消息按添加顺序（时间序）存储；外部修改返回值不影响内部状态
- [x] 1.4 上游依赖 `p1-assemble-prompt`，依赖同步检查（Dependency Sync Check）结论：`NO_DRIFT`（消息管理独立于 prompt 组装）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                 | 测试用例名                                                          | 断言要点                                                  |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `--- add appends message ---`                                       | 新增后长度为 1，`content` 与输入一致                      |
| S2          | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `--- add preserves order ---`                                       | 连续添加后顺序与插入顺序一致                              |
| S3          | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `--- clear empties messages array ---`                              | `clear()` 后 `getMessages().length === 0`                 |
| S4          | `apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts` | `--- defensive copy also isolates one-level metadata mutations ---` | 修改返回值后重新获取，原始 `metadata.tokenCount` 保持不变 |

## 3. Red（先写失败测试）

- [x] 新增 S4 失败用例：外部修改 `getMessages()` 返回值中的 `metadata.tokenCount`，断言内部状态不变。
- [x] Red 命令与结果：
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`
  - 失败输出：`AssertionError [ERR_ASSERTION]: external metadata mutation must not affect internal state (999 !== 11)`

## 4. Green（最小实现通过）

- [x] 最小实现：`chatMessageManager.ts` 新增 `cloneChatMessage`，在 `add()` 和 `getMessages()` 中统一做防御性克隆（含一层 `metadata`）。
- [x] Green 命令与结果：
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`（通过）
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts`（回归通过）

## 5. Refactor（保持绿灯）

- [x] 抽取 `cloneChatMessage` 消除复制逻辑，避免 `add/getMessages` 双处偏移。
- [x] 复用同一克隆函数后再次执行目标测试，保持绿灯。

## 6. Evidence

- [x] Dependency Sync Check（上游 `p1-assemble-prompt`）：
  - `test -d openspec/changes/archive/p1-assemble-prompt && echo "p1-assemble-prompt archived: yes"`
  - `rg -n "export function assembleSystemPrompt|export const GLOBAL_IDENTITY_PROMPT" apps/desktop/main/src/services/ai/{assembleSystemPrompt.ts,identityPrompt.ts}`
  - 核对结论：数据结构/IPC 契约/错误码/阈值均 `NO_DRIFT`
- [x] Red/Green 命令证据已记录到 `openspec/_ops/task_runs/ISSUE-483.md`
- [x] 交付阶段证据路径已预留并将在 `openspec/_ops/task_runs/ISSUE-483.md` 持续回填（preflight / PR / checks / merge / main sync / task archive）

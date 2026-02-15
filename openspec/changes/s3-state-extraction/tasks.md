## 1. Specification

- [ ] 1.1 审阅并确认 `s3-state-extraction` 范围：章节完成触发提取、匹配实体并回写 `lastSeenState`
- [ ] 1.2 审阅并确认失败路径：LLM 异常、脏输出、未知实体均需可观测降级
- [ ] 1.3 审阅并确认不可变契约：章节完成主流程不被阻断，KG 仅更新可匹配实体
- [ ] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check），记录“无漂移/已更新”；无上游依赖时标注 N/A

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [ ] S3-STE-S1 `章节完成后提取并更新匹配角色状态 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/stateExtractor.test.ts`
  - 测试名：`extracts state changes and updates matched entities`
- [ ] S3-STE-S2 `提取结果包含未知角色时跳过并记录告警 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/stateExtractor.test.ts`
  - 测试名：`skips unknown entities and emits structured warning`
- [ ] S3-STE-S3 `提取失败时章节完成流程保持可用且失败可观测 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/stateExtractor.integration.test.ts`
  - 测试名：`chapter-complete flow degrades gracefully when extraction fails`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S3-STE-S1 失败测试，确认当前系统不会自动回写状态
- [ ] 3.2 编写 S3-STE-S2 失败测试，确认未知实体处理和告警缺失
- [ ] 3.3 编写 S3-STE-S3 失败测试，确认失败可观测语义尚未建立
- [ ] 3.4 运行最小测试集并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 实现 `stateExtractor` 与 LLM 输出 schema 校验
- [ ] 4.2 打通章节完成触发链路并回写 KG `lastSeenState`
- [ ] 4.3 为失败场景增加结构化告警/错误码输出，保持主流程可用

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛提取与回写边界，避免跨服务重复转换逻辑
- [ ] 5.2 清理不必要 helper 层，保持调用链可追踪

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录章节完成流程在提取失败时的降级与可观测证据

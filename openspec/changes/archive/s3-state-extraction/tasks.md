## 1. Specification

- [x] 1.1 审阅并确认 `s3-state-extraction` 范围：章节完成触发提取、匹配实体并回写 `lastSeenState`
- [x] 1.2 审阅并确认失败路径：LLM 异常、脏输出、未知实体均需可观测降级
- [x] 1.3 审阅并确认不可变契约：章节完成主流程不被阻断，KG 仅更新可匹配实体
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check），记录“无漂移/已更新”；无上游依赖时标注 N/A

### 依赖同步检查（Dependency Sync Check）

- 输入：
  - `openspec/changes/archive/s3-kg-last-seen/specs/knowledge-graph-delta.md`
  - `docs/plans/unified-roadmap.md`（AR-C22/AR-C23）
  - `openspec/specs/knowledge-graph/spec.md`
- 核对项：
  - `lastSeenState` ↔ `last_seen_state` 字段命名与持久化映射稳定；
  - 状态回写仅触达已存在实体，不创建隐式实体；
  - 失败路径需输出结构化降级信号与日志字段，章节完成主流程不被阻断。
- 结论：`NO_DRIFT`
- 后续动作：进入 Red，先补 S1/S2/S3 失败测试。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S3-STE-S1 `章节完成后提取并更新匹配角色状态 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/stateExtractor.test.ts`
  - 测试名：`extracts state changes and updates matched entities`
- [x] S3-STE-S2 `提取结果包含未知角色时跳过并记录告警 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/stateExtractor.test.ts`
  - 测试名：`skips unknown entities and emits structured warning`
- [x] S3-STE-S3 `提取失败时章节完成流程保持可用且失败可观测 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/stateExtractor.integration.test.ts`
  - 测试名：`chapter-complete flow degrades gracefully when extraction fails`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-STE-S1 失败测试，确认当前系统不会自动回写状态
- [x] 3.2 编写 S3-STE-S2 失败测试，确认未知实体处理和告警缺失
- [x] 3.3 编写 S3-STE-S3 失败测试，确认失败可观测语义尚未建立
- [x] 3.4 运行最小测试集并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 实现 `stateExtractor` 与 LLM 输出 schema 校验
- [x] 4.2 打通章节完成触发链路并回写 KG `lastSeenState`
- [x] 4.3 为失败场景增加结构化告警/错误码输出，保持主流程可用

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛提取与回写边界，避免跨服务重复转换逻辑
- [x] 5.2 清理不必要 helper 层，保持调用链可追踪

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录章节完成流程在提取失败时的降级与可观测证据

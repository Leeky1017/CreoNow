# 提案：context-engine-p2-stable-prefix-hash

## 背景

CE-1/CE-2 已固化层契约与预算链路，但 prompt caching 的命中/失效还缺少严格的 Stable Prefix Hash 语义。
若不固定 hash 输入与判定条件，相同请求可能出现缓存抖动，导致成本和延迟不可控。

## 变更内容

- 固化 `Rules + Settings` 的确定性 SHA-256 计算规则。
- 固化 `stablePrefixUnchanged` 语义、cache 命中条件与失效条件。
- 明确禁止时间戳、随机 ID 等非确定性输入污染 hash。

## 受影响模块

- Context Engine delta：`openspec/changes/context-engine-p2-stable-prefix-hash/specs/context-engine-delta.md`
- Context Engine（后续实现阶段）：`apps/desktop/main/src/services/context/`
- AI Service 消费侧（后续实现阶段）：`apps/desktop/main/src/services/ai/`

## 依赖关系

- 上游依赖：`context-engine-p1-token-budget-truncation`
- 下游依赖：`context-engine-p4-hardening-boundary`

## Dependency Sync Check

- 核对输入：
  - `openspec/changes/context-engine-p1-token-budget-truncation/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/ipc/spec.md`
- 核对项：数据结构、IPC 契约、错误码、阈值。
- 结论：`NO_DRIFT`。

## Out-of-scope

- Token 预算裁剪细节。
- Judge 判定算法实现。
- Constraints CRUD 与约束裁剪策略。

## 审阅状态

- Owner 审阅：`PENDING`

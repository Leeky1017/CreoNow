# 05 - Memory System（CRUD / settings / injection preview / preference learning）

> 上游 Requirement：`CNWB-REQ-070`  
> 目标：定义 CN V1 的记忆系统边界：可控（可关/可删/可审计）+ 可学习（偏好闭环）+ 可降级（不阻断技能）。

---

## 1. Memory 类型与作用域（V1 固定）

### 1.1 类型（最小集合）

- `preference`：用户偏好（风格/措辞/禁用表达等）
- `fact`：事实（人物/设定事实；更偏项目级）
- `note`：杂项记忆（可选）

> 注：V1 不要求一次性交付完整 taxonomy；但必须保证“新增 type 不破坏旧数据”。

### 1.2 作用域

- `global`：全局记忆（跨项目）
- `project`：项目记忆（绑定 `projectId`）

---

## 2. Settings（必须可控）

记忆系统至少包含以下开关（通过 `memory:settings:get/update` 管理）：

- `injectionEnabled: boolean`（默认 true）
- `preferenceLearningEnabled: boolean`（默认 true）
- `privacyModeEnabled: boolean`（默认 false；true 时减少/禁止写入可识别内容证据）
- `preferenceLearningThreshold: number`（默认建议 3；阈值达到后生成 learned preference）

约束：

- settings 更新必须支持部分更新（patch），且返回“更新后完整 settings”。
- settings 写入失败必须返回稳定错误码（通常 `DB_ERROR`）。

---

## 3. CRUD 语义（IPC）

### 3.1 最小通道

- `memory:create`
- `memory:list`
- `memory:update`
- `memory:delete`
- `memory:settings:get`
- `memory:settings:update`
- `memory:injection:preview`
- `memory:preferences:ingest`
- `memory:preferences:clear`

### 3.2 删除语义（SHOULD：软删除）

V1 SHOULD 采用软删除（`deleted_at` tombstone）以支持审计与未来恢复；list/preview 默认过滤已删除条目。

---

## 4. Injection Preview（注入预览）

### 4.1 输入

- `projectId?: string | null`
- `queryText?: string`（可选；用于语义召回排序，见 §6）

### 4.2 输出（必须可解释）

注入预览必须返回：

- `items[]`：按最终注入顺序排列
  - `id/type/scope/content`
  - `reason`（可解释：deterministic/semantic score）
- `mode`：`deterministic | semantic`
- `diagnostics`：降级原因（如适用）

### 4.3 排序与确定性（MUST）

当 `queryText` 缺失或语义召回不可用时，必须回退到确定性排序（示例优先级）：

1. scope：project > global
2. type：preference > fact > note
3. recency：updated_at desc
4. tie-break：id lexicographic asc（保证完全确定）

---

## 5. Preference Learning（偏好学习闭环）

### 5.1 信号来源（V1）

- 来自 `ai:skill:feedback` 的用户行为（accept/reject/partial），携带 `evidenceRef`（短文本/标签）。-（可选）来自 UI 的显式“采纳/拒绝原因”输入。

### 5.2 噪声过滤（MUST）

为了避免“记忆污染”，偏好学习必须过滤噪声：

- `evidenceRef` 为空或过短 → 计为 ignored
- 隐私模式开启（`privacyModeEnabled=true`）→ 不记录原文片段，只记录抽象标签

### 5.3 阈值触发（MUST）

当同类信号累计达到 `preferenceLearningThreshold`：

- MUST 生成/更新一条 learned preference memory（type=`preference`，origin=`learned`）
- MUST 可被 injection preview 命中并展示（可解释）

---

## 6. 语义召回（可选，但必须定义边界与降级）

### 6.1 目标

为 `user_memory` 提供“与当前请求语义相关”的召回能力（TopK），用于注入排序补充。

### 6.2 关键边界（MUST）

- query-dependent 的召回结果 MUST 进入动态层（`retrieved` 或 `immediate`），不得进入 stable prefix（避免破坏 `stablePrefixHash`）。

### 6.3 降级策略（MUST）

必须覆盖并可观测：

- sqlite-vec 不可用 → `mode=deterministic`，记录 reason
- embedding 维度冲突 → `mode=deterministic`，记录 reason（可建议“重建索引”）
- `queryText` 为空 → `mode=deterministic`

---

## 7. 测试要求（必须）

- Unit：
  - deterministic 排序完全确定（同输入同输出）
  - 噪声过滤：空 evidence → ignored
  - 阈值触发：达到阈值生成 learned memory
- E2E（Windows）：
  - 开启注入与学习 → 运行 skill → feedback accept → 再次运行 skill → 断言 injected memory 包含 learned 条目
  - 关闭 injection → injected 为空且模板结构稳定

---

## Reference (WriteNow)

参考路径：

- `WriteNow/openspec/specs/sprint-ai-memory/spec.md`（偏好注入 + 反馈追踪的规范约束）
- `WriteNow/openspec/specs/sprint-ai-memory-semantic-recall/spec.md`（user_memory_vec + queryText + fallback + stablePrefixHash 边界）
- `WriteNow/tests/e2e/sprint-ai-memory-preference-feedback.spec.ts`（偏好学习闭环的 E2E 断言点）
- `WriteNow/electron/ipc/memory.cjs`（memory IPC 的错误映射语义）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- 记忆系统必须“可控”：可关闭、可预览注入、可审计；否则会快速失去用户信任。
- 语义召回必须可降级且不得阻断主链路；降级原因必须可观测并可在 E2E 断言。

# Context Engine Delta — context-engine-p2-stable-prefix-hash

## [MODIFIED] Requirement: Stable Prefix Hash（prompt caching）

系统必须对 `Rules + Settings` 执行确定性 SHA-256，输出 `stablePrefixHash`，并据此产生 `stablePrefixUnchanged` 语义。

确定性规则：

- 输入范围仅限 `Rules + Settings`。
- 先执行 canonicalize：
  - 按字段名稳定排序。
  - 约束列表按 `priority desc`、`id asc` 排序。
  - 删除非确定性字段（如 `timestamp`、`requestId`、随机 nonce）。
- `stablePrefixHash = SHA256(canonicalizedPayload)`。

`stablePrefixUnchanged` 语义：

- 对同一 `projectId + skillId + provider + model + tokenizerVersion`，若本次 hash 与上次一致，则 `stablePrefixUnchanged=true`。
- 命中缓存条件：`stablePrefixUnchanged=true` 且 provider 支持 prompt caching 且缓存未过期。
- 失效条件：Rules/Settings 任一变化、model 变化、tokenizerVersion 变化、provider 切换。

### Scenario: CE3-R1-S1 Rules/Settings 不变时命中 Stable Prefix [ADDED]

- **假设** 同一项目连续触发续写，Rules 与 Settings 未变
- **当** 计算 `stablePrefixHash`
- **则** hash 与上次请求一致
- **并且** 返回 `stablePrefixUnchanged=true`

### Scenario: CE3-R1-S2 Prefix 变化或非确定性字段被剔除后触发失效 [ADDED]

- **假设** 用户新增一条有效 Settings 规则，且请求体含 `timestamp`
- **当** 计算 `stablePrefixHash`
- **则** `timestamp` 不参与 hash
- **并且** 因 Settings 变化导致 hash 与上次不同，`stablePrefixUnchanged=false`

## Out of Scope

- Token 预算比例与裁剪策略。
- Judge 模块具体实现。
- Constraints CRUD 与优先级冲突求解。

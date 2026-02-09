# Context Engine Delta — context-engine-p3-constraints-rules-injection

## [MODIFIED] Requirement: Constraints（创作约束）

系统必须提供可判定的 Constraints CRUD 契约，并将约束按固定优先级注入 Rules 层。

Constraints IPC：

- `constraints:list`
- `constraints:create`
- `constraints:update`
- `constraints:delete`

统一响应：

- 成功：`{ ok: true, data: ... }`
- 失败：`{ ok: false, error: { code, message, details? } }`

失败码：

- `CONSTRAINT_VALIDATION_ERROR`
- `CONSTRAINT_NOT_FOUND`
- `CONSTRAINT_CONFLICT`
- `CONTEXT_SCOPE_VIOLATION`

Rules 注入格式（固定）：

```text
[创作约束 - 不可违反]
1. <constraint text>  # source=user|kg, priority=<P>
2. <constraint text>  # source=user|kg, priority=<P>
```

优先级规则：

- 用户显式约束（`source=user`）优先级高于 KG 自动约束（`source=kg`）。
- 同优先级按 `updatedAt` 降序，再按 `id` 升序稳定排序。

约束膨胀裁剪策略：

- 当 Rules 约束块超出预算线，先裁剪 `source=kg` 低优先级项，再裁剪 `source=user` 中可降级项。
- 裁剪必须记录 `constraintId`、`reason`、`tokenFreed` 到日志。

### Scenario: CE4-R1-S1 Constraints CRUD 返回可判定结果 [ADDED]

- **假设** 用户创建、更新、删除约束
- **当** 调用 `constraints:*` IPC 通道
- **则** 成功路径返回 `ok=true`
- **并且** 非法输入或目标不存在时返回对应错误码

### Scenario: CE4-R1-S2 Rules 注入按固定优先级排序 [ADDED]

- **假设** 同时存在用户显式约束与 KG 自动约束
- **当** Context Engine 组装 Rules 层
- **则** 注入顺序满足 `user > kg`
- **并且** 同级排序满足稳定规则（`updatedAt desc` + `id asc`）

### Scenario: CE4-R1-S3 约束膨胀触发裁剪并落日志 [ADDED]

- **假设** 约束条目过多导致 Rules 约束块超出预算线
- **当** Context Engine 执行约束裁剪
- **则** 优先裁剪低优先级 KG 约束
- **并且** 每条被裁剪约束都记录结构化日志

## Out of Scope

- Judge 检测与自动重生成算法。
- Stable Prefix Hash 命中策略。
- 预算默认比例调整。

# Skill System Specification Delta

## Change: s0-context-observe

### Requirement: 上下文组装异常必须降级但可观测（记录结构化 warning） [ADDED]

SkillExecutor 在组装上下文（context assembly）时出现异常，必须保持 best-effort 降级继续执行，同时输出可追踪的结构化 warning，避免静默吞错。

#### Scenario: context 组装失败时记录结构化 warning 且技能继续执行 [ADDED]

- **假设** `assembleContextPrompt` 在一次技能执行中抛出异常（例如 `KG_UNAVAILABLE`）
- **当** SkillExecutor 捕获到该异常
- **则** 必须记录 warning 事件 `context_assembly_degraded`
- **并且** warning payload 必须包含 `executionId`、`skillId`、`error`
- **并且** 技能执行链路保持可继续（降级但不中断）

#### Scenario: context 组装成功时不产生降级 warning [ADDED]

- **假设** `assembleContextPrompt` 正常返回上下文
- **当** SkillExecutor 继续执行技能
- **则** 不应记录 `context_assembly_degraded` warning
- **并且** 返回结果与现有成功路径契约一致

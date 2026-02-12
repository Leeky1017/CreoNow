# Memory System Specification Delta

## Change: p2-memory-injection

### Requirement: REQ-MEM-CONTEXT-INJECTION Memory 上下文注入 [ADDED]

Memory 系统**必须**通过 Context Engine 的 settings fetcher 将用户偏好记忆注入 AI 上下文。

注入流程：

1. settings fetcher 调用 `memoryService.previewInjection({ projectId, documentId })`
2. `previewInjection` 返回 `MemoryInjectionPreview`（已有接口，`memoryService.ts` L52-56）
3. settings fetcher 将 `preview.items` 格式化为 chunks

注入格式：

```
[用户写作偏好 — 记忆注入]
- 动作场景：偏好短句，节奏紧凑（来源：自动学习）
- 叙事视角：严格第一人称（来源：手动添加）
```

每条 memory item 一行，包含 `content` 和 `origin` 中文标注。

origin 中文映射：`learned → "自动学习"`、`manual → "手动添加"`。

chunk 的 `source` 字段为 `"memory:injection"`。

当 `memoryService.previewInjection` 返回 `ok: false` 或抛出异常时，settings fetcher 返回空 chunks + warning `"MEMORY_UNAVAILABLE: 记忆数据未注入"`。

当 `previewInjection` 返回空 items 时，settings fetcher 返回空 chunks（正常情况，非错误，无 warning）。

当 `previewInjection` 返回 `diagnostics.degradedFrom` 时，将降级信息添加到 warnings：`"MEMORY_DEGRADED: <reason>"`。

#### Scenario: S1 正常注入记忆到 settings 层 [ADDED]

- **假设** mock `memoryService.previewInjection` 返回 `{ items: [{ id: "m1", type: "preference", scope: "project", origin: "learned", content: "动作场景偏好短句", reason: { kind: "deterministic" } }, { id: "m2", type: "preference", scope: "global", origin: "manual", content: "严格第一人称叙述", reason: { kind: "deterministic" } }], mode: "deterministic" }`
- **当** settings fetcher 执行组装
- **则** 返回 chunks 数量 >= 1
- **并且** chunks 内容包含 `"动作场景偏好短句"`
- **并且** chunks 内容包含 `"严格第一人称叙述"`
- **并且** `chunks[0].source === "memory:injection"`

#### Scenario: S2 记忆为空时返回空 chunks [ADDED]

- **假设** mock `memoryService.previewInjection` 返回 `{ ok: true, data: { items: [], mode: "deterministic" } }`
- **当** settings fetcher 执行组装
- **则** 返回 `{ chunks: [] }`
- **并且** 无 warning

#### Scenario: S3 memoryService 异常时降级 [ADDED]

- **假设** mock `memoryService.previewInjection` 抛出异常 `new Error("DB locked")`
- **当** settings fetcher 执行组装
- **则** 返回 `{ chunks: [], warnings: ["MEMORY_UNAVAILABLE: 记忆数据未注入"] }`
- **并且** 不抛出异常

#### Scenario: S4 语义降级时报告 diagnostics [ADDED]

- **假设** mock `memoryService.previewInjection` 返回 `{ ok: true, data: { items: [{ id: "m1", type: "preference", scope: "global", origin: "learned", content: "偏好简洁风格", reason: { kind: "deterministic" } }], mode: "deterministic", diagnostics: { degradedFrom: "semantic", reason: "embedding service unavailable" } } }`
- **当** settings fetcher 执行组装
- **则** chunks 正常返回（包含 `"偏好简洁风格"`）
- **并且** warnings 包含 `"MEMORY_DEGRADED: embedding service unavailable"`

#### Scenario: S5 格式化输出包含 origin 标注 [ADDED]

- **假设** mock `memoryService.previewInjection` 返回 memory item `{ content: "偏好简洁风格", origin: "learned" }`
- **当** settings fetcher 格式化该 item
- **则** 输出包含 `"偏好简洁风格"`
- **并且** 输出包含 `"自动学习"` 或 `"learned"`

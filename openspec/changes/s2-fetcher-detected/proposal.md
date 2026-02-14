# 提案：s2-fetcher-detected

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（AR-C12）定义了该 change：retrieved fetcher 需要调用匹配引擎，并将检测到的 `when_detected` 实体注入上下文。若该链路缺失，实体识别结果无法进入 Prompt，引用检测收益无法落地。

## 变更内容

- 在 `retrievedFetcher` 中接入 entity matcher。
- 对匹配到的实体执行“查询完整实体 → 格式化注入”流程。
- 增加“文本命中注入”与“never 不注入”等 Red 测试并转绿。

## 受影响模块

- Context Engine：`apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`
- Context 测试：`apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`

## 依赖关系

- 上游依赖：`s2-entity-matcher`、`s2-fetcher-always`。
- 上游建议依赖：`s1-break-context-cycle`（roadmap 建议在其后执行）。
- 并行关系：与 `s2-memory-injection` 无直接依赖。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：Phase 2 依赖图（C12 依赖匹配引擎 + rules fetcher）与 C12 条目范围。
- 核对项：输入文本命中后注入、`aiContextLevel=never` 不注入、格式化链路完整。
- 结论：`NO_DRIFT`（当前草案与路线图一致）。

## 踩坑提醒（防复发）

- 必须覆盖“命中/未命中/never”分支，避免 `FAKETEST`。
- matcher 异常与实体查询异常需显式告警，避免静默吞错（`SILENT`）。
- 仅做最小链路接入，避免过度扩展检索职责。

## 防治标签

- `FAKETEST`
- `SILENT`

## 不做什么

- 不实现 matcher 算法本体（由 `s2-entity-matcher` 负责）。
- 不改动 always 规则注入策略（由 `s2-fetcher-always` 负责）。
- 不扩展到 Sprint 2 之外的 RAG 检索能力。

## 审阅状态

- Owner 审阅：`PENDING`

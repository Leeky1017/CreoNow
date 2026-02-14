# 提案：s2-store-race-fix

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（A6-M-002 + A6-M-003）指出：`kgStore` 与 `searchStore` 在快速切换/快速输入场景下存在异步竞态，旧请求结果可能覆盖新状态，形成“无报错但状态错误”的静默失败风险。

## 变更内容

- 在 `kgStore` 引入请求代次（request epoch/stamp）与项目上下文比对，阻断旧请求回写。
- 在 `searchStore` 引入 `AbortController` 与请求标记比对，确保仅最新请求可提交结果。
- 增加竞态回归测试，覆盖“快速切换项目”和“快速输入查询”两类高风险场景。

## 受影响模块

- Workbench Store（`apps/desktop/renderer/src/stores/kgStore.ts`）— 增加请求代次校验与写入门禁。
- Workbench Store（`apps/desktop/renderer/src/stores/searchStore.ts`）— 增加中断控制与请求顺序校验。
- 相关 store 测试层 — 新增竞态回归断言。

## 依赖关系

- 上游依赖：无强依赖（Sprint 2 债务组独立项）。
- 执行分组：位于推荐执行顺序 W6（与 `s2-memory-panel-error` 同批）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 债务组 `s2-store-race-fix` 条目；
  - Sprint 2 依赖关系中“债务组内部全部独立”约束。
- 核对项：
  - 范围限定为 store 竞态写回控制，不扩展为数据层重构；
  - `kgStore` 与 `searchStore` 均需提供“旧请求不覆盖新状态”的可验证保障；
  - 测试必须覆盖快速切换与快速输入两类触发场景。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- 不能只在请求发起处打标记，提交前也必须做一致性校验。
- `AbortController` 仅解决中断，不等于天然防止越序提交，仍需结果提交前比对。
- 避免新增“兜底吞错”分支掩盖竞态问题。

## 防治标签

- `SILENT` `FAKETEST` `GHOST`

## 不做什么

- 不改动 KG/Search 的业务查询语义。
- 不重构 store 外部 API。
- 不在本 change 内处理 MemoryPanel 错误态逻辑（该项由 `s2-memory-panel-error` 处理）。

## 审阅状态

- Owner 审阅：`PENDING`

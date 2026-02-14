# 提案：s1-scheduler-error-ctx

## 背景

`docs/plans/unified-roadmap.md` 将 `s1-scheduler-error-ctx` 标记为 Sprint 1 Wave 1 独立项（A3-H-001 + A6-M-004）。当前 `skillScheduler.ts` 在 `response`/`completion` 双路径异常处理中存在上下文丢失问题：`completion.catch` 直接降级为 `failed` 但未保留错误细节；同时双异步路径分离处理，存在终态写入一致性风险，降低排障可追踪性。

## 变更内容

- 收敛 `response` 与 `completion` 的错误处理语义：异常必须保留可诊断上下文，而非仅输出 `failed` 终态。
- 明确调度终态一致性约束：同一任务终态只能收敛一次，避免双路径竞态造成状态漂移。
- 规范结构化日志字段，确保 `skill_response_error` / `skill_completion_error` 具备完整排障上下文。

## 受影响模块

- Skill System（`apps/desktop/main/src/services/skills/skillScheduler.ts`）— 调度异常路径与终态收敛语义。
- Skill System 测试（`apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts`）— 新增场景回归与日志字段断言。

## 依赖关系

- 上游依赖：无（`unified-roadmap` 标记为 Sprint 1 并行 Wave 1 独立项）。
- 横向协同：与 `s1-path-alias`、`s1-break-context-cycle`、`s1-break-panel-cycle` 并行执行；本 change 仅触达 scheduler 错误路径，不扩展至 service extract 或 IPC 拆分。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-scheduler-error-ctx` 条目（A3-H-001 + A6-M-004）；
  - `openspec/specs/skill-system/spec.md` 中“多技能并发调度、超时与依赖管理”及失败可观测性约束。
- 核对项：
  - 变更边界限定为 scheduler 的 `response`/`completion` 异常上下文保留与终态一致性；
  - 不修改队列并发阈值、依赖校验策略、技能 I/O 契约；
  - 日志字段必须满足跨日志检索与问题定位最小完备性。
- 结论：`NO_DRIFT`（与 unified-roadmap 定义一致，可进入 TDD 规格化与实施）。

## 踩坑提醒（防复发）

- `response` 与 `completion` 存在竞态，终态收敛必须防重复 finalize，避免出现“日志报错但终态被后写覆盖”。
- `error` 对象可能为非 `Error` 类型（string/object），日志写入前需统一序列化规则，避免信息再次丢失。
- 若需要扩展 `finalizeTask` 入参，必须保持外部行为契约不变，避免引入额外状态分支。

## 防治标签

- `SILENT` `FALLBACK` `FAKETEST`

## 不做什么

- 不调整调度器并发上限、超时默认值、队列容量等策略参数。
- 不新增或修改 IPC 通道、错误码字典与 UI 交互行为。
- 不在本 change 中做 `skillScheduler` 以外的架构拆分或 service 提取。

## 审阅状态

- Owner 审阅：`PENDING`

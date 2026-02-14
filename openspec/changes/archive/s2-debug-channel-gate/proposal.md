# 提案：s2-debug-channel-gate

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（A4-M-001）指出：`db:debug:tablenames` 通道在常规注册路径中可被触达，可能泄露数据库结构信息。该问题属于主进程 IPC 暴露面治理，需按生产环境最小暴露原则收口。

## 变更内容

- 为 `db:debug:tablenames` 注册增加环境门禁，仅允许非 production 环境注册。
- 增加测试覆盖：验证 production 环境下该通道不可用、非 production 环境保持可用。
- 保持既有调试能力仅在开发/测试链路可见。

## 受影响模块

- IPC（`apps/desktop/main/src/index.ts`）— debug 通道注册策略收敛。
- IPC 测试层 — 增加环境门禁行为断言。

## 依赖关系

- 上游依赖：无强依赖（Sprint 2 债务组独立项）。
- 执行分组：位于推荐执行顺序 W5（与 `s2-service-error-decouple` 同批）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 债务组 `s2-debug-channel-gate` 条目；
  - Sprint 2 依赖关系中“债务组内部全部独立”约束。
- 核对项：
  - 变更范围限定在 debug 通道注册门禁；
  - 生产禁用与非生产可用需同时被测试验证；
  - 不扩展到其他 IPC 通道行为改造。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- 避免只在 handler 内部做软校验；应在注册阶段直接阻断生产暴露面。
- 测试必须覆盖正反两侧环境（production / non-production），防止误伤开发调试能力。
- 错误提示不得泄露底层数据库结构细节。

## 防治标签

- `SECURITY` `FAKETEST`

## 不做什么

- 不新增其他 debug IPC 通道。
- 不调整现有 IPC 错误码体系。
- 不改动与 `db:debug:tablenames` 无关的主进程初始化逻辑。

## 审阅状态

- Owner 审阅：`PENDING`

# 提案：s2-test-timing-fix

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（A3-M-001）指出：当前测试集中存在批量 `setTimeout(resolve, ...)` 驱动的异步等待模式（统计 19 处），导致测试对固定时长睡眠产生依赖，容易形成“表面通过但行为未被可靠验证”的虚假覆盖风险。

## 变更内容

- 将涉及 `setTimeout(resolve, ...)` 的异步测试等待方式改为条件等待（`waitFor`/条件轮询/事件等待）。
- 逐文件补齐“条件达成才通过”的断言，避免仅依赖固定延时。
- 对替换后的测试做稳定性复验，确保不引入新的时序抖动。

## 受影响模块

- Cross-Module Integration 测试层（涉及 19 个测试文件）— 异步等待机制从固定 sleep 收敛为条件等待。
- 相关测试用例断言层 — 从时间假设驱动转为行为结果驱动。

## 依赖关系

- 上游依赖：无强依赖（Sprint 2 债务组标注“全部独立，可任意并行或按触碰文件批处理”）。
- 执行分组：位于推荐执行顺序 W4（与 `s2-story-assertions` 同批）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 债务组 `s2-test-timing-fix` 条目；
  - Sprint 2 内部依赖关系段（债务组独立约束）。
- 核对项：
  - 范围限定为“测试等待机制替换 + 稳定性验证”；
  - 不扩展为业务代码改造；
  - 与同批次 `s2-story-assertions` 无顺序阻塞。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- 禁止把固定 sleep 改成“更长 sleep”作为替代方案；必须改为条件等待。
- 避免通过过度 mock 绕过真实异步条件，否则会再次形成虚假覆盖。
- 批量替换后需回看失败信息可读性，确保问题能定位到具体条件未达成。

## 防治标签

- `FAKETEST` `GHOST`

## 不做什么

- 不修改生产代码中的异步实现逻辑。
- 不引入新的测试框架或额外依赖。
- 不在本 change 内处理与 Story 测试断言无关的问题（该项由 `s2-story-assertions` 处理）。

## 审阅状态

- Owner 审阅：`PENDING`

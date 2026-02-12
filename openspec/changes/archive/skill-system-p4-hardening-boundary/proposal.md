# 提案：skill-system-p4-hardening-boundary

## 背景

Skill System 全部功能（p0–p3）就绪后，需要统一硬化验收标准、异常矩阵与 NFR 场景，确保模块达到生产级可验收标准。

## 变更内容

- 模块级可验收标准硬化：
  - `skill:execute` 响应 p95 < 120ms。
  - 队列入队响应 p95 < 80ms。
  - 取消指令生效 p95 < 300ms。
  - TypeScript strict + zod，所有 `skill:*` 通道声明 request/response schema。
- 异常矩阵覆盖：
  - 网络/IO：LLM 调用失败、流式通道断开。
  - 数据异常：自定义技能 schema 非法、prompt 模板缺失变量。
  - 并发冲突：并发取消与完成竞态、同名技能覆盖竞态。
  - 容量溢出：队列溢出（已在 p3 实现）、单输出超长。
  - 权限/安全：跨项目技能读取、未授权技能执行。
- NFR 场景绑定：
  - 全局并发上限保护（8 并发，其余排队无丢弃）。
  - 自定义技能容量超限（全局 1,000 / 每项目 500）→ `SKILL_CAPACITY_EXCEEDED`。
  - 同名技能覆盖竞态 → project > global > builtin 一致性解析。
  - 跨项目技能越权 → `SKILL_SCOPE_VIOLATION` + 安全审计日志。
- 失败处理策略统一：
  - 超时中断返回 `SKILL_TIMEOUT`。
  - 可恢复失败允许一键重试（复用原参数）。
  - 失败事件广播到 AI 面板和日志。

## 受影响模块

- Skill System 全子模块

## 依赖关系

- 上游依赖：`skill-system-p0` ~ `skill-system-p3`
- 下游依赖：无

## 不做什么

- 不新增功能特性
- 不修改已通过的外部行为契约

## 审阅状态

- Owner 审阅：`PENDING`

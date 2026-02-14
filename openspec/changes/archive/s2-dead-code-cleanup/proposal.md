# 提案：s2-dead-code-cleanup

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-dead-code-cleanup` 定义为 Sprint 2 债务修复项（A2-M-004 + A1-M-003 + A1-M-004）。当前存在若干不可达或低价值噪声代码（不可达 catch、barrel 过度注释、一行包装函数），增加阅读与维护负担。

## 变更内容

- 清理 ping 处理链路中不可达/无效异常分支，保持行为不变。
- 收敛 `AiDialogs` barrel 文件注释噪声，保留必要导出语义。
- 去除 KG 运行时一行包装函数，直接调用目标实现。

## 受影响模块

- Cross Module Integration（Main/Renderer 边界卫生）— 启动链路、KG 运行时、AiDialogs barrel

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：与同文件功能开发可并行，但需保持低风险最小改动。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-dead-code-cleanup` 条目；
  - `openspec/specs/cross-module-integration-spec.md` 的跨模块契约稳定性要求。
- 核对项：
  - 清理项仅限死代码/噪声，不改变对外行为；
  - 导出面与调用面保持兼容；
  - 跨模块链路无新增分支与错误码。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 清理死代码时必须先确认“不可达”证据，避免误删真实兜底路径。

## 防治标签

- `ADDONLY` `NOISE`

## 不做什么

- 不重构模块架构。
- 不调整对外接口与错误码字典。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`

# 提案：s2-shortcuts

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 2 Phase 3 将 `s2-shortcuts`（AR-C21）定义为写作技能快捷键系统，示例包括 `Ctrl+Enter` 触发续写、`Ctrl+Shift+R` 触发润色。
Phase 3 依赖图同时给出 `s2-shortcuts` 依赖 `s2-write-button` 与 `s2-bubble-ai`（依赖 C16 + C17），因此本 change 需在既有技能触发入口之上统一键盘分发契约。

## 变更内容

- 定义编辑器快捷键映射与分发契约，支持写作技能快速触发。
- 落地至少两条路线图示例快捷键：`Ctrl+Enter`（续写）、`Ctrl+Shift+R`（润色）。
- 约束触发行为：命中快捷键后路由到对应技能入口，未命中快捷键不触发技能。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/editor/`）— 快捷键映射、事件分发与技能触发桥接。
- AI 协作入口（写作技能触发层）— 作为被调用端，不在本 change 内改写技能语义。

## 依赖关系

- 上游依赖：`s2-write-button` + `s2-bubble-ai`（Phase 3 依赖图标注 `s2-shortcuts` 依赖 C16+C17）。
- 下游依赖：无新增硬依赖。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 `s2-shortcuts` 条目；
  - `docs/plans/unified-roadmap.md` Phase 3 依赖图（`s2-write-button` / `s2-bubble-ai` -> `s2-shortcuts`）。
- 核对项：
  - 快捷键范围仅覆盖技能触发映射与分发，不改动技能本体；
  - 依赖声明与路线图一致，仅引用 C16/C17；
  - 示例快捷键至少包含路线图点名的两条组合键。
- 结论：`NO_DRIFT`（与路线图一致；进入 Red 前需复核 C16/C17 触发入口无漂移）。

## 踩坑提醒（防复发）

- 快捷键处理容易与浏览器/编辑器默认行为冲突，测试要验证命中映射时的唯一路由。
- 映射表分散会导致维护重复（`DUP`），需保持单点配置。
- 仅测试 key 字符串匹配会产生伪绿，应覆盖“正确触发目标技能、不触发非目标技能”。

## 防治标签

`FAKETEST` `DRIFT` `DUP`

## 不做什么

- 不实现新的写作技能能力或改动技能提示词。
- 不在本 change 内扩展 Slash 命令体系或 inline diff 交互。
- 不改写 `s2-write-button`、`s2-bubble-ai` 的业务语义。

## 审阅状态

- Owner 审阅：`PENDING`

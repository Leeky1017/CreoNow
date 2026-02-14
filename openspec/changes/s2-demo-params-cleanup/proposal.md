# 提案：s2-demo-params-cleanup

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-demo-params-cleanup` 定义为 Sprint 2 债务修复项（A1-M-001 + A1-M-002）。`AiInlineConfirm` 与 `AiErrorCard` 中保留的 demo 控制参数会把展示演示逻辑带入生产组件契约，增加噪声并干扰真实行为验证。

## 变更内容

- 移除组件对 demo 控制参数（如 `simulateDelay`、`initialState`、`retryWillSucceed`）的依赖。
- 组件行为统一由真实回调与状态驱动，Story 演示参数下沉到 Story 层。
- 补齐参数清理后的行为断言，避免“伪测试通过、真实路径未覆盖”。

## 受影响模块

- Workbench（AI Dialog Components）— `AiInlineConfirm`、`AiErrorCard` 及对应 stories

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：与 AI 对话 UI 其它迭代可并行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-demo-params-cleanup` 条目；
  - `openspec/specs/workbench/spec.md` 的命令面板/右侧面板行为一致性约束。
- 核对项：
  - 生产组件不再暴露 demo-only 参数；
  - Story 层可继续演示但不污染组件 API；
  - 行为由外部回调结果驱动，可被测试验证。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 不要把 Story 控制参数反向注入生产组件 props；演示能力应停留在 Story 层。

## 防治标签

- `ADDONLY` `FAKETEST` `NOISE`

## 不做什么

- 不改 AI 对话业务流程与错误码设计。
- 不新增 UI 视觉状态。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`

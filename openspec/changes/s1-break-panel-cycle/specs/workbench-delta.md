# Workbench Specification Delta

## Change: s1-break-panel-cycle

### Requirement: OpenSettings 上下文必须从 RightPanel 提取为独立模块并消除循环依赖 [ADDED]

为保证 Workbench 右侧面板与 AI 面板依赖方向稳定，系统必须满足：

- `OpenSettingsContext` 与 `useOpenSettings` 必须定义在独立文件 `apps/desktop/renderer/src/contexts/OpenSettingsContext.ts`。
- `AiPanel` 获取 `useOpenSettings` 时必须直接依赖 `contexts/OpenSettingsContext`，不得再依赖 `components/layout/RightPanel`。
- `RightPanel` 可以临时 re-export `useOpenSettings` 以兼容现有消费方，但其职责仅限容器渲染与 Provider 装配，不再承载 hook 定义。
- 必须通过依赖图校验确认 `RightPanel` 入口不再包含 `RightPanel` ↔ `AiPanel` 循环。

#### Scenario: 提取 OpenSettingsContext 后可独立提供设置回调 [ADDED]

- **假设** `RightPanel` 仍需向嵌套组件提供打开设置对话框的回调
- **当** `OpenSettingsContext` 被提取到 `contexts/OpenSettingsContext.ts`
- **则** `OpenSettingsProvider` 能透传 `onOpenSettings` 回调给消费方
- **并且** `useOpenSettings` 在无 Provider 场景下返回稳定 no-op，避免运行时报错

#### Scenario: RightPanel / AiPanel 依赖解环 [ADDED]

- **假设** `RightPanel` 渲染 `AiPanel` 作为右侧标签内容
- **当** `AiPanel` 改为从 `contexts/OpenSettingsContext` 获取 `useOpenSettings`
- **则** `AiPanel` 不再从 `RightPanel` 反向引入 hook
- **并且** `madge --circular` 对 `RightPanel.tsx` 入口检查结果为无环

#### Scenario: 兼容现有 useOpenSettings 消费方 [ADDED]

- **假设** 现有测试或模块仍通过 `components/layout/RightPanel` 路径引用 `useOpenSettings`
- **当** `s1-break-panel-cycle` 交付后
- **则** 兼容导出仍可用，不造成立即性编译或运行中断
- **并且** 兼容消费方行为与提取前一致（有 Provider 时返回回调，无 Provider 时返回 no-op）

## Out of Scope

- RightPanel 标签数量、布局宽度与交互规则变更
- AI 面板业务逻辑、IPC 协议、模型/技能流程调整
- 与本变更无关的其他循环依赖治理

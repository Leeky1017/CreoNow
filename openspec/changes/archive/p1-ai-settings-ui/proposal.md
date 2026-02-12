# 提案：p1-ai-settings-ui

## 背景

后端已有 provider 配置逻辑和加密存储（`aiProxySettingsService`），但前端无设置页面、无 API Key 输入界面、无模型选择 UI。用户完全无法配置 AI 提供商，AI 功能从安装到首次使用之间存在不可跨越的断层。

审计来源：`docs/audit/06-onboarding-ux-config.md` §3.1

不改的风险：用户无法通过 UI 配置 AI 服务，即使后端已实现加密存储也无法使用。

## 变更内容

- 创建 `apps/desktop/renderer/src/features/settings/AiSettingsSection.tsx` 组件
- 设置面板 AI 配置区包含：
  - Provider 模式选择（`<select>`：OpenAI-compatible / OpenAI BYOK / Anthropic BYOK）
  - Base URL 输入框
  - API Key 输入框（`type="password"`），placeholder 显示"已配置"/"未配置"
  - "保存"按钮（调用 `ai:config:update` IPC）
  - "测试连接"按钮（调用 `ai:config:test` IPC）
  - 连接状态指示（成功显示延迟 ms / 失败显示错误码和消息）
  - 错误状态显示
- 无可用 API Key 时，AI 面板发送区应显示配置引导文案（本 change 关注设置面板本身，降级引导由后续集成负责）

## 受影响模块

- workbench delta：`openspec/changes/p1-ai-settings-ui/specs/workbench-delta.md`
- 实现文件：`apps/desktop/renderer/src/features/settings/AiSettingsSection.tsx`

## 不做什么

- 不实现模型选择下拉框（依赖 `ai:model:list` IPC，本 change 仅处理配置存储和测试）
- 不实现 Onboarding 引导流程（Phase 6）
- 不修改后端逻辑（C6 已完成）

## 依赖关系

- 上游依赖：`p1-apikey-storage`（C6，提供 `ai:config:get`/`ai:config:update`/`ai:config:test` IPC 通道）
- 下游依赖：无（Phase 1 终端节点）

## Dependency Sync Check

- 核对输入：`p1-apikey-storage` 的 IPC 契约
- 核对项：
  - 数据结构：`AiProxySettings` 类型字段与 `ai:config:get` 返回一致 ✓
  - IPC 契约：`ai:config:get`/`ai:config:update`/`ai:config:test` 三通道 ✓
  - 错误码：`UNSUPPORTED`（加密不可用）、`INVALID_ARGUMENT`（空 patch）、`AI_AUTH_FAILED`（401）、`AI_RATE_LIMITED`（429）✓
  - 阈值：测试连接超时 2000ms ✓
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：`apps/desktop/renderer/src/features/settings/AiSettingsSection.tsx`
- 测试文件路径：`apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx`
- 验证命令：`pnpm vitest run apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx`
- Mock 要求：
  - 必须 mock `invoke`（`../../lib/ipcClient`）函数，返回预设 IPC 响应
  - 使用 `@testing-library/react` 进行组件渲染和交互测试
  - 禁止依赖真实 Electron IPC

## 审阅状态

- Owner 审阅：`PENDING`

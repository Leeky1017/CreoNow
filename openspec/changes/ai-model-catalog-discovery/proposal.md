# 提案：ai-model-catalog-discovery

## 背景

当前 AI Panel 的 ModelPicker 使用静态模型列表，无法反映 Proxy/BYOK 实际可用模型。
这会导致用户在面板中选择了并不存在于当前网关或供应商的模型 ID，进而触发上游失败。

## 变更内容

- 新增 `ai:models:list` IPC 通道，按当前生效配置返回可用模型列表。
- 将 `ai:skill:run` 的 `model` 契约从固定枚举改为字符串，以支持真实模型 ID。
- 在 AI 面板中优先使用动态模型列表渲染 ModelPicker。
- 在 Settings 的 Proxy 页面增加“可用模型”展示与刷新入口。
- 在 Settings 的 Proxy 页面增加 provider 模式：`openai-compatible`、`openai(byok)`、`anthropic(byok)`。
- 修复上游 URL 拼接，保证带路径前缀的 `baseUrl`（如 `/api/v1`）不被截断。
- 对非 JSON 上游响应返回确定性 `UPSTREAM_ERROR`，避免 HTML 解析异常泄漏。
- 升级 AI 面板 ModelPicker 交互：搜索、分组、滚动、最近使用。

## 受影响模块

- IPC：`openspec/specs/ipc/spec.md`（delta）
- AI Service：`openspec/specs/ai-service/spec.md`（delta）
- Renderer：`apps/desktop/renderer/src/features/ai/*`、`apps/desktop/renderer/src/features/settings/ProxySection.tsx`
- Main：`apps/desktop/main/src/ipc/ai.ts`、`apps/desktop/main/src/services/ai/aiService.ts`

## 不做什么

- 不实现“自动按模型切 provider”策略。
- 不变更编辑器“AI 输出直接写入正文”的交互行为。
- 不引入新的第三方 UI 组件库，保持现有设计系统与主题令牌。

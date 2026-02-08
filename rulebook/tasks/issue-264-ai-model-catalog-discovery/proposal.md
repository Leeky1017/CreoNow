# Rulebook Proposal: issue-264-ai-model-catalog-discovery

- Goal: 将模型列表从静态改为按 Proxy/BYOK 实时发现，并在 Panel/Settings 中可见。
- Scope: IPC 契约、Main AI Service、AI IPC handler、Renderer Panel + Proxy settings。
- Out of scope: 自动 provider 切换、AI 输出自动写入编辑器正文。

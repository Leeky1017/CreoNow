# Workbench Rulebook Spec (Issue 561)

## Scope

仅覆盖 `s3-i18n-setup`：i18n 初始化基线、locale skeleton、App shell key-render 启动路径。

## Scenarios

- S3-I18N-SETUP-S1: 初始化默认语言 `zh-CN` 与回退语言 `en`。
- S3-I18N-SETUP-S2: 缺失 key 时可观测回退，不返回静默空串。
- S3-I18N-SETUP-S3: App shell 基础文案入口通过 i18n key 渲染。

## Out of Scope

- 全量文案抽取
- 语言切换 UI
- 主进程/IPC 变更

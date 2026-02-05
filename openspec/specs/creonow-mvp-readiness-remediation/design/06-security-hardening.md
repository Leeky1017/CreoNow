# Design 06 — Security Hardening（Keytar + XSS）

> Spec: `../spec.md#cnmvp-req-006`、`../spec.md#cnmvp-req-007`
>
> Related cards:
> - `../task_cards/p1/P1-004-keytar-secure-api-key-storage.md`
> - `../task_cards/p1/P1-005-xss-hardening-sanitize-html.md`

## 1) API Key 安全存储（keytar）

### 1.1 写死的存储策略

- 目标：AI Proxy API Key 不得以明文落 SQLite settings
- 方案：使用 `keytar`（系统密钥链）
- SQLite 中只允许保存：
  - `enabled`（boolean）
  - `baseUrl`（string）
  - `apiKeyConfigured`（通过 keytar 是否存在推导，或存一个冗余 boolean 但必须与 keytar 同步）

### 1.2 Keytar key 命名（写死）

- service: `creonow.ai.proxy`
- account: `apiKey`

> 为什么写死：避免不同实现者各自命名导致迁移/读取失败。

### 1.3 迁移策略（必须）

升级后首次读取 settings 时：

1. 若 SQLite 旧值存在且 keytar 中不存在：
   - 写入 keytar
   - 清空 SQLite 旧值（写空字符串或删除该 key，写死策略见任务卡）
2. 若 keytar 已存在：
   - 忽略 SQLite 的任何值（以 keytar 为 SSOT）

### 1.4 测试策略（必须可测）

- main 单测必须覆盖：
  - 迁移发生（sqlite→keytar）
  - keytar 不可用时的降级行为（必须写死：返回错误 or 视为未配置）
- CI/Linux 环境对 keytar 可能不可用：必须提供 stub 注入点（依赖显式传入）

## 2) XSS 防护（DOMPurify / 安全渲染）

### 2.1 写死规则

任何 `dangerouslySetInnerHTML`：

- 要么移除（改用组件安全渲染）
- 要么写死 sanitizer：`DOMPurify.sanitize(html, { /* options */ })`

### 2.2 最小覆盖点（来自审评报告）

- `apps/desktop/renderer/src/features/editor/EditorToolbar.stories.tsx` 使用 `dangerouslySetInnerHTML` 显示 `editor.getHTML()`

MVP 策略建议（写死其一，执行者不得自选）：

- 路径 A（推荐）：改为 TipTap 的 `EditorContent`（避免 innerHTML）
- 路径 B：保留 innerHTML 但必须 DOMPurify sanitize

任务卡会写死选择哪条路径，以避免实现漂移。


# CreoNow 全项目审计报告（最小颗粒度）

> **审计日期**: 2026-02-06
> **基准**: `AGENTS.md` · `design/DESIGN_DECISIONS.md` · `openspec/specs/creonow-spec/spec.md`
> **目标**: agent 拿到本报告后可直接定位文件/行号并动手修复

---

## 〇、阅读指南

每个问题条目格式：

```
### N.M 问题标题
- **文件**: 精确路径:行号
- **现状**: 当前代码做了什么
- **问题**: 为什么这是问题
- **修复**: 具体该怎么改（到函数/变量级别）
```

---

## 一、类型/函数重复定义（DRY 违反）

### 1.1 `IpcInvoke` 类型在 renderer 8 个 store 中重复定义

- **文件（8 处，行号为各文件中的定义位置）**:
  - `renderer/src/stores/aiStore.ts:40-43`
  - `renderer/src/stores/editorStore.tsx:12-15`
  - `renderer/src/stores/fileStore.ts:13-16`
  - `renderer/src/stores/projectStore.tsx:10-13`
  - `renderer/src/stores/kgStore.ts` (同样定义)
  - `renderer/src/stores/searchStore.ts` (同样定义)
  - `renderer/src/stores/memoryStore.ts` (同样定义)
  - `renderer/src/stores/versionStore.tsx` (同样定义)
- **现状**: 每个 store 文件顶部都有完全相同的 4 行类型定义：
  ```typescript
  export type IpcInvoke = <C extends IpcChannel>(
    channel: C,
    payload: IpcRequest<C>,
  ) => Promise<IpcInvokeResult<C>>;
  ```
- **问题**: 违反 AGENTS.md "一条链路一套实现"。修改签名需同步 8 处。
- **修复**:
  1. 在 `renderer/src/lib/ipcClient.ts` 中添加 `export type IpcInvoke = ...`（该文件已有 `invoke` 函数，只缺类型导出）
  2. 8 个 store 文件中删除本地定义，改为 `import type { IpcInvoke } from "../lib/ipcClient";`

### 1.2 `ServiceResult<T>` + `Ok<T>` + `Err` 在主进程 23 个文件中重复定义

- **文件（23 处）**: 以下每个文件顶部都有完全相同的 3 行类型定义：
  - `main/src/services/ai/aiService.ts`
  - `main/src/services/ai/aiProxySettingsService.ts`
  - `main/src/services/documents/documentService.ts`
  - `main/src/services/projects/projectService.ts`
  - `main/src/services/embedding/embeddingService.ts`
  - `main/src/services/export/exportService.ts`
  - `main/src/services/judge/judgeService.ts`
  - `main/src/services/kg/kgService.ts`
  - `main/src/services/memory/memoryService.ts`
  - `main/src/services/memory/preferenceLearning.ts`
  - `main/src/services/memory/userMemoryVec.ts`
  - `main/src/services/rag/ragService.ts`
  - `main/src/services/search/ftsService.ts`
  - `main/src/services/stats/statsService.ts`
  - `main/src/services/skills/skillLoader.ts`
  - `main/src/services/skills/skillValidator.ts`
  - `main/src/services/skills/skillService.ts`
  - `main/src/services/context/contextFs.ts`
  - `main/src/services/context/watchService.ts`
  - `main/src/ipc/constraints.ts`
  - `main/src/ipc/stats.ts`
  - `main/src/db/init.ts`
  - `main/src/services/documents/derive.ts`
- **现状**: 每个文件定义：
  ```typescript
  type Ok<T> = { ok: true; data: T };
  type Err = { ok: false; error: IpcError };
  export type ServiceResult<T> = Ok<T> | Err;
  ```
- **修复**:
  1. 创建 `packages/shared/types/service-result.ts`，导出 `Ok<T>`、`Err`、`ServiceResult<T>`
  2. 23 个文件删除本地定义，改为 `import type { ServiceResult } from "@shared/types/service-result";`
  3. 需要先建立 path alias（见 1.5）

### 1.3 `ipcError()` 辅助函数在 23+ 个文件中重复定义

- **文件**: 与 1.2 相同的 23 个文件 + `renderer/src/features/ai/applySelection.ts:23-25`（renderer 侧也有一份简化版）
- **现状**: 每个文件定义几乎相同的函数：
  ```typescript
  function ipcError(code: IpcError["code"], message: string, cause?: unknown): IpcError {
    return { code, message, cause: String(cause) };
  }
  ```
  部分文件（如 `applySelection.ts`）省略了 `cause` 参数。
- **修复**:
  1. 在 `packages/shared/types/service-result.ts` 中同时导出 `ipcError()` 函数
  2. 所有 24 处删除本地定义，统一 import

### 1.4 `packages/shared` 空壳 — Monorepo 价值未兑现

- **文件**: `packages/shared/` 目录
- **现状**: 仅含 3 个文件：
  - `types/ipc-generated.ts` (自动生成，1138 行)
  - `types/ai.ts` (467 bytes，仅 stream event 类型)
  - `redaction/redact.ts` (1591 bytes)
- **问题**: 上述 `IpcInvoke`(×8)、`ServiceResult`(×23)、`ipcError`(×24) 等高复用类型/函数全部散落在 main/renderer 各处。Monorepo 的 shared 包应该是这些东西的归宿。
- **修复**:
  1. 创建 `packages/shared/types/service-result.ts` — 放 `ServiceResult<T>` + `ipcError()`
  2. 创建 `packages/shared/types/ipc-invoke.ts` — 放 `IpcInvoke` 类型
  3. `packages/shared/package.json` 添加对应入口

### 1.5 TypeScript path alias 缺失 — 5-6 层 `../` 相对路径

- **文件**: `apps/desktop/tsconfig.json` — 无 `compilerOptions.paths`
- **现状**: 所有对 `packages/shared` 的引用（约 60 处）使用：
  ```typescript
  import type { ... } from "../../../../../packages/shared/types/ipc-generated";
  // 或 6 层
  import type { ... } from "../../../../../../packages/shared/types/ai";
  ```
- **修复**:
  1. `tsconfig.base.json` 添加:
     ```json
     "paths": {
       "@shared/*": ["packages/shared/*"]
     }
     ```
  2. `electron.vite.config.ts` 中 renderer 和 main 的 resolve.alias 添加对应映射
  3. 全局替换 `../` 路径为 `@shared/` 路径

---

## 二、AI 核心链路问题

### 2.1 model 参数硬编码 `"fake"` — 4 处

- **文件**（4 处）:
  - `main/src/services/ai/aiService.ts:504` — `runOpenAiNonStream` 中 `model: "fake"`
  - `main/src/services/ai/aiService.ts:540` — `runOpenAiStream` 中 `model: "fake"`
  - `main/src/services/ai/aiService.ts:555` — `runAnthropicNonStream` 中 `model: "fake"`
  - `main/src/services/ai/aiService.ts:603` — `runAnthropicStream` 中 `model: "fake"`
- **问题**: 非 E2E/fake-server 环境下无法使用任何真实 AI 模型。**功能阻塞性缺陷**。
- **修复**:
  1. `createAiService(deps)` 的 deps 中添加 `model: string` 参数（或从 proxy settings 读取）
  2. 4 处 `model: "fake"` 替换为 `model: args.model ?? deps.defaultModel`
  3. IPC contract `ai:skill:run` 的 request payload 中添加可选 `model` 字段

### 2.2 Anthropic `max_tokens: 256` 硬编码 — 2 处

- **文件**:
  - `main/src/services/ai/aiService.ts:555` — `runAnthropicNonStream` 中 `max_tokens: 256`
  - `main/src/services/ai/aiService.ts:603` — `runAnthropicStream` 中 `max_tokens: 256`
- **问题**: Anthropic API 要求 `max_tokens` 必传。256 token ≈ 200 英文单词，对创作 IDE 来说极短。
- **修复**: 将 `256` 替换为可配置参数，默认值建议 `4096`。从 skill 定义或 proxy settings 读取。

### 2.3 ModelPicker UI 存在但与后端完全断线

- **文件**:
  - `renderer/src/features/ai/ModelPicker.tsx:6-13` — 定义了 4 个模型选项（GPT-5.2、CreoW、DeepSeek、Claude Opus）
  - `renderer/src/features/ai/AiPanel.tsx:223` — `selectedModel` 是 `React.useState` 本地状态
  - `renderer/src/stores/aiStore.ts` — **无任何 `model` 字段**
- **现状**: 用户在 UI 中选择模型后，`selectedModel` 只存在于 AiPanel 的局部 state 中。`aiStore.run()` 的调用（AiPanel.tsx:294-299）不传递 `selectedModel`。IPC `ai:skill:run` payload 中无 `model` 字段。后端硬编码 `"fake"`。
- **问题**: 模型选择 UI 是**纯装饰**，用户选什么都不影响实际请求。
- **修复**:
  1. `aiStore` 状态中添加 `selectedModel: string` 字段和 `setSelectedModel` action
  2. `aiStore.run()` 将 `selectedModel` 传入 IPC payload
  3. IPC contract 添加 `model` 字段
  4. 后端 `aiService` 使用 payload 中的 `model` 而非硬编码
  5. AiPanel 中将 `selectedModel` 状态改为从 store 读取

### 2.4 ModePicker UI 存在但完全无功能

- **文件**:
  - `renderer/src/features/ai/ModePicker.tsx:6-12` — 定义 3 个模式（Agent、Plan、Ask）
  - `renderer/src/features/ai/AiPanel.tsx:222` — `selectedMode` 是本地 state
- **现状**: 选择 mode 后无任何效果。`aiStore.run()` 不接收 mode 参数，后端不区分 mode。
- **问题**: UI 承诺了 Agent/Plan/Ask 三种模式，但全部是空壳。
- **修复**: 短期可以移除 ModePicker 避免误导用户；长期需要在 skill 体系中实现 mode 分发。

### 2.5 ChatHistory 使用硬编码 MOCK_HISTORY

- **文件**: `renderer/src/features/ai/ChatHistory.tsx:23-54`
- **现状**: `MOCK_HISTORY` 是 5 条硬编码的假数据。Rename/Delete 按钮标注 "Coming soon" 且 `disabled`。
- **问题**: 用户看到的历史记录是假的。无聊天持久化。
- **修复**: 短期在 ChatHistory 组件上标注 placeholder 状态，避免用户误认为真实数据。长期需要实现聊天持久化 IPC。

### 2.6 AI feedback 只记日志不持久化

- **文件**: `main/src/services/ai/aiService.ts:984-991`
- **现状**:
  ```typescript
  const feedback: AiService["feedback"] = (args) => {
    deps.logger.info("ai_feedback_received", { ... });
    return { ok: true, data: { recorded: true } };
  };
  ```
- **问题**: 返回 `recorded: true` 但实际未写入 DB。调用方（renderer）以为已持久化。
- **修复**: 创建 `ai_feedback` 表并写入。或者将 `recorded` 改为 `false` 并附带说明。

### 2.7 renderer 侧 AI stream 缺少客户端超时保护

- **文件**: `renderer/src/stores/aiStore.ts:289-293`
- **现状**: stream 模式下 `set({ status: "running" })` 后完全依赖主进程的 `onStreamEvent` 推进状态。
- **问题**: 如果主进程 stream 事件丢失或 IPC 断开，UI 永远停在 "running"。主进程有 10s 超时，但 renderer 没有独立保护。
- **修复**: 在 `aiStore.run()` 的 stream 分支中启动一个 15s（大于主进程超时）的 `setTimeout`，若超时未收到事件则 `set({ status: "error" })`。

### 2.8 AiPanel 内嵌 `<style>` 标签

- **文件**: `renderer/src/features/ai/AiPanel.tsx:692-708`
- **现状**:
  ```tsx
  <style>{`
    .typing-cursor::after {
      content: '';
      ...
      animation: blink 1s step-end infinite;
    }
    @keyframes blink { ... }
  `}</style>
  ```
- **问题**: 每次 AiPanel 渲染都插入 `<style>` 元素到 DOM。且 `main.css` 中已有 `@keyframes cursor-blink` 动画定义（main.css:194-199），功能重复。
- **修复**: 删除内联 `<style>` 块，改用 `main.css` 中已有的 `.animate-cursor-blink` 类，或在 `main.css` 中添加 `.typing-cursor::after` 规则。

---

## 三、编辑器核心链路问题

### 3.1 TipTap 只用了 StarterKit，无任何自定义扩展

- **文件**: `renderer/src/features/editor/EditorPane.tsx:23`
- **现状**: `extensions: [StarterKit]` — 只有 bold/italic/headings/lists/blockquote/code/history。
- **缺失扩展清单**:

| 缺失功能 | TipTap 扩展 | 文件影响 | 优先级 |
|---------|------------|---------|-------|
| Placeholder | `@tiptap/extension-placeholder` | EditorPane.tsx | P0 |
| 字数统计 | `@tiptap/extension-character-count` | EditorPane.tsx, ZenMode | P0 |
| Markdown 快捷输入 | InputRule 已含于 StarterKit（`#`→H1 已可用），但缺 Typography | — | P1 |
| 选中浮动菜单 | `@tiptap/extension-bubble-menu` | 新文件 | P1 |
| AI 建议高亮 | 自定义 Mark extension | 新文件 | P1 |
| 查找/替换 | 自定义扩展 | 新文件 | P1 |
| 图片 | `@tiptap/extension-image` | EditorPane.tsx | P2 |

- **修复**: 在 `features/editor/` 下创建 `extensions/` 目录，逐个添加扩展并在 EditorPane 中组合。

### 3.2 编辑器未使用设计规范字体/字号

- **文件**: `renderer/src/features/editor/EditorPane.tsx:29`
- **现状**: `class: "h-full outline-none p-4 text-[var(--color-fg-default)]"`
- **问题**: 缺少 `font-family`、`font-size`、`line-height`。设计规范 §4.2 要求：
  - 编辑器正文：`font-family: var(--font-family-body)` (Lora/Crimson Pro)
  - 字号：`16px`
  - 行高：`1.8`
- **修复**: 将 class 改为：
  ```
  "h-full outline-none p-4 text-[var(--color-fg-default)] font-[var(--font-family-body)] text-base leading-[1.8]"
  ```
  或在 `main.css` 中添加 `.ProseMirror` 全局样式。

### 3.3 Autosave 状态显示不真实

- **文件**: `renderer/src/features/editor/useAutosave.ts:44`
- **现状**: `setAutosaveStatus("saving")` 在 debounce timer **启动时**就调用，而非实际 IPC 保存时。
- **问题**: 用户看到 "Saving..." 但实际在等 500ms debounce。真正的 save 调用发生在 `:48-55` 的 setTimeout 回调中。
- **修复**: 将 `setAutosaveStatus("saving")` 移到 `timerRef.current = window.setTimeout(() => {` 回调内部，即 `void save(...)` 之前。同时在 debounce 等待期间可设为 `"pending"` 状态（需在 editorStore 中添加此状态值）。

### 3.4 Autosave cleanup fire-and-forget 无错误处理

- **文件**: `renderer/src/features/editor/useAutosave.ts:66-73`
- **现状**:
  ```typescript
  void save({
    projectId: args.projectId,
    documentId: args.documentId,
    contentJson: queued,
    actor: "auto",
    reason: "autosave",
  });
  ```
- **问题**: effect cleanup 中的 `void save(...)` 是 fire-and-forget。如果保存失败，错误被静默吞掉，用户不会收到任何通知。
- **修复**: 将 `void save(...)` 改为 `save(...).catch((err) => console.error("autosave-cleanup-failed", err));`。或更好地，在 editorStore.save 内部已有错误状态处理，确保 cleanup 阶段也能设置 `autosaveStatus: "error"`。

### 3.5 suppressAutosave 依赖 `setTimeout(fn, 0)` 的微任务时序

- **文件**: `renderer/src/features/editor/EditorPane.tsx:46-55`
- **现状**:
  ```typescript
  suppressAutosaveRef.current = true;
  editor.commands.setContent(JSON.parse(documentContentJson));
  // finally:
  window.setTimeout(() => {
    suppressAutosaveRef.current = false;
    setContentReady(true);
  }, 0);
  ```
- **问题**: 依赖 `setTimeout(0)` 来确保 TipTap 的 `update` 事件在 suppress 期间触发。如果 setContent 触发异步扩展更新，suppress 可能过早解除。
- **修复**: 改用 TipTap 的 `onUpdate` 配合计数器模式：在 `setContent` 前记录 `expectedUpdateCount`，在 `onUpdate` 回调中检查是否是 setContent 触发的 update，而非依赖时序。

### 3.6 ZenMode 是只读展示，非编辑模式

- **文件**:
  - `renderer/src/features/zen-mode/ZenMode.tsx:70-238` — 接收 `content: { title, paragraphs }` 做纯 HTML 渲染
  - `renderer/src/components/layout/AppShell.tsx:41-88` — `extractZenModeContent()` 手动解析 TipTap JSON
- **现状**: ZenMode 不使用 TipTap 编辑器实例。内容由 `extractZenModeContent` 从 JSON 手动提取 heading 和 paragraph 节点文本。列表、代码块、引用、图片等全部丢失。
- **问题**: 设计规范 §1.3 要求"全屏纯编辑"，实际是只读。用户在 ZenMode 下**无法编辑**任何内容。
- **修复**:
  1. ZenMode 组件改为接收 `editor: Editor` 实例（或创建独立的 TipTap 编辑器并同步内容）
  2. 删除 `extractZenModeContent` 函数
  3. ZenMode 中挂载 `<EditorContent editor={editor} />` 并应用全屏样式
  4. wordCount 改用 `@tiptap/extension-character-count` 扩展

### 3.7 ZenMode 硬编码颜色和字体

- **文件**: `renderer/src/features/zen-mode/ZenMode.tsx:99-113`
- **现状**:
  ```tsx
  style={{
    backgroundColor: "#050505",                    // 硬编码
    zIndex: "var(--z-modal)",
    fontFamily: "var(--font-family-ui)",            // 应为 body
  }}
  // ...
  background: "radial-gradient(circle at center, rgba(59, 130, 246, 0.03) 0%, ..."  // 蓝色
  ```
- **问题**:
  - `#050505` 应为 `var(--color-bg-base)`
  - `rgba(59, 130, 246, ...)` 是蓝色强调色，`DESIGN_DECISIONS.md` B.2 要求替换为 `var(--color-accent)`
  - `font-family-ui` 应为 `font-family-body`（创作区域使用 body 字体）
- **修复**: 替换为 CSS 变量。

### 3.8 ZenModeOverlay 的 useMemo 依赖 editor 引用（内容可能过时）

- **文件**: `renderer/src/components/layout/AppShell.tsx:105-112`
- **现状**:
  ```tsx
  const content = React.useMemo(() => {
    if (editor) {
      const json = JSON.stringify(editor.getJSON());
      return extractZenModeContent(json);
    }
    return extractZenModeContent(documentContentJson);
  }, [editor, documentContentJson]);
  ```
- **问题**: `editor` 是 TipTap 编辑器实例，其引用在生命周期内不变（但内容持续变化）。`useMemo` 的依赖项 `[editor, documentContentJson]` 中 `editor` 引用不变意味着编辑器内容更新不会触发重新计算。只有 `documentContentJson`（来自 store 的 autosave 后的值）变化时才更新。用户在编辑器中输入但尚未 autosave 时打开 ZenMode，看到的是**上一次保存的内容**。
- **修复**: 如果保留只读模式（不推荐），应在 ZenMode 打开时主动从 `editor.getJSON()` 获取最新内容，而非依赖 useMemo 缓存。

### 3.9 editor feature 目录极度单薄

- **文件**: `renderer/src/features/editor/` — 仅 6 个文件
- **现状**:
  ```
  EditorPane.tsx          (主组件, 146 行)
  EditorPane.stories.tsx  (story)
  EditorToolbar.tsx       (工具栏, 346 行)
  EditorToolbar.test.tsx  (测试)
  useAutosave.ts          (hook, 88 行)
  // 缺失: extensions/, config/, utils/
  ```
- **问题**: 作为"创作者的 Cursor"，编辑器核心只有 2 个功能文件 + 1 个 hook。无自定义扩展、无编辑器配置模块、无快捷键映射（快捷键在 `config/shortcuts.ts` 中定义但只用于 Toolbar tooltip）。

---

## 四、数据层问题

### 4.1 Migration version 跳跃 — sqlite-vec 迁移可能永久丢失

- **文件**: `main/src/db/init.ts:43-62`
- **现状**: `MIGRATIONS_BASE` 版本序列为 1,2,3,4,5,6,7,9（跳过 8）。Version 8 是 `SQLITE_VEC_MIGRATION`，在 `initDb` 中单独处理且为 best-effort。
- **问题**: 如果首次启动时 sqlite-vec 扩展不可用：
  1. Base 迁移跑完 → `schema_version` = 9
  2. 之后 sqlite-vec 可用 → `filter((m) => m.version > 9)` 过滤掉 version 8
  3. **vec0 表永远不会被创建**，语义搜索/向量功能永久不可用
- **修复**: 两个方案选一：
  - A) 在 `initDb` 中单独检测 version 8 是否已执行（可查 `sqlite_master` 中是否存在 vec0 表），未执行则补跑
  - B) 将 vec migration 纳入 base 序列，加载失败时标记为 skip 但不影响版本号

### 4.2 DB 初始化失败后应用仍然启动

- **文件**: `main/src/index.ts:302-306`
- **现状**:
  ```typescript
  const db: DbInitOk["db"] | null = dbRes.ok ? dbRes.db : null;
  if (!dbRes.ok) {
    logger.error("db_init_failed", { code: dbRes.error.code });
  }
  ```
- **问题**: DB 失败只记日志，`db = null` 传给所有 handler。每个 handler 开头检查 `if (!deps.db)`。应用启动但几乎所有功能不可用，用户只看到各种错误——无可理解的降级提示。
- **修复**:
  1. renderer 中添加全局 ErrorBoundary（当前不存在，见 6.1）
  2. 主进程在 DB 失败时通过 IPC 或 window 状态通知 renderer 显示降级 UI
  3. 或者直接在 BrowserWindow 加载前检测 DB 状态，失败则显示错误页面

### 4.3 version 表无版本修剪策略

- **文件**: `main/src/services/documents/documentService.ts` — `writeDocument` 方法
- **现状**: 每次 autosave（内容变化时）都 INSERT 新 version 行，存储完整 `content_json`。无版本上限、无自动清理。
- **问题**: 长时间编辑后 `document_versions` 表持续膨胀。如果用户编辑 1 小时（每 30 秒 autosave），产生 120 个 version 行，每行存完整 JSON。
- **修复**: 添加修剪策略，例如：保留最近 50 个 version + 每天保留 1 个 snapshot + 手动标记的 version 永不删除。

---

## 五、设计规范遵循问题

### 5.1 Tailwind 颜色映射完全缺失 — 533 处 arbitrary value

- **文件**: `renderer/src/styles/main.css:7-32` — `@theme` block
- **现状**: `@theme` 中只定义了 spacing、radius、font-family，**无任何颜色映射**。
- **问题**: `DESIGN_DECISIONS.md` 附录 A.2 详细定义了 Tailwind 颜色映射：
  ```javascript
  theme: { extend: { colors: {
    bg: { base: 'var(--color-bg-base)', surface: 'var(--color-bg-surface)', ... },
    fg: { default: 'var(--color-fg-default)', muted: 'var(--color-fg-muted)', ... },
  }}}
  ```
  但代码中完全没有实现。导致全项目 **533 处** arbitrary value 写法 `bg-[var(--color-bg-surface)]` 而非语义化 `bg-bg-surface`。
- **修复**: 在 `main.css` 的 `@theme` block 中添加完整的颜色映射（约 30 个变量），然后全局替换 arbitrary value 为语义化 class。

### 5.2 `--color-accent` 核心强调色 token 未定义

- **文件**: `renderer/src/styles/tokens.css`
- **现状**: tokens.css 中**不存在** `--color-accent`、`--color-accent-hover`、`--color-accent-muted`、`--color-accent-subtle`。
- **问题**: 设计规范 §3.6 定义的核心强调色系统完全缺失：
  ```css
  --color-accent: #ffffff;
  --color-accent-hover: rgba(255, 255, 255, 0.9);
  --color-accent-muted: rgba(255, 255, 255, 0.6);
  --color-accent-subtle: rgba(255, 255, 255, 0.1);
  ```
  这是设计语言最核心的决策（"纯白系强调色，让内容成为焦点"）。
- **注意**: 代码中有部分组件已在使用 `var(--color-accent)`（如 `ExportDialog.tsx:309`、`OutlinePanel.tsx:303`），但因 token 未定义，这些引用在运行时会 fallback 到浏览器默认值。
- **修复**: 在 `tokens.css` 的 `:root` 中添加完整的 accent 色系。

### 5.3 112 处硬编码颜色 — 23 个 .tsx 文件

- **最严重违规文件**:
  - `features/search/SearchPanel.tsx` — **~55 处**硬编码颜色（`#3b82f6`, `#888888`, `#444444`, `#0f0f0f`, `#121212` 等）
  - `features/outline/OutlinePanel.tsx:184` — `color: "#d4d4d4"`（h2 标题色）
  - `features/outline/OutlinePanel.tsx:548` — `bg-[#0b0b0b]`（空状态背景）
  - `features/zen-mode/ZenMode.tsx:100` — `backgroundColor: "#050505"`
  - `features/export/ExportDialog.tsx:314` — `bg-[rgba(8,8,8,0.5)]`
  - `features/export/ExportDialog.tsx:417` — `bg-[#050505]`
  - `features/export/ExportDialog.tsx:721` — `!bg-white !text-black hover:!bg-gray-200`（Tailwind !important 覆盖）
- **修复**:
  - SearchPanel.tsx 需要完全重写样式层，将所有硬编码颜色替换为 CSS 变量
  - OutlinePanel `#d4d4d4` → `var(--color-fg-default)` 或 `var(--color-fg-muted)`
  - ExportDialog `!bg-white !text-black` → `bg-[var(--color-accent)] text-[var(--color-bg-base)]`

### 5.4 SearchPanel 硬编码 "Search took 0.04s"

- **文件**: `renderer/src/features/search/SearchPanel.tsx:864`
- **现状**: `<span className="...">Search took 0.04s</span>` — 硬编码假数据
- **修复**: 从搜索结果中获取实际耗时，或隐藏此信息直到有真实数据。

### 5.5 tokens.css 中有规范外的冗余 accent 变量

- **文件**: `renderer/src/styles/tokens.css:61-66`
- **现状**:
  ```css
  --color-accent-blue: #3b82f6;
  --color-accent-green: #22c55e;
  --color-accent-orange: #f97316;
  --color-accent-cyan: #06b6d4;
  --color-accent-purple: #8b5cf6;
  ```
- **问题**: 这些变量在 `DESIGN_DECISIONS.md` 中不存在。规范定义的是 `--color-node-*`（知识图谱节点色），值完全相同。`--color-accent-blue` 与 `--color-node-character` 值都是 `#3b82f6`。
- **修复**: 删除 `--color-accent-*` 系列，统一使用 `--color-node-*` 命名。

### 5.6 tokens.css 与 design/system/01-tokens.css 双源

- **文件**:
  - `renderer/src/styles/tokens.css` — 实际使用（153 行）
  - `design/system/01-tokens.css` — 设计参考
- **问题**: 两者内容高度相似但不完全一致。renderer 版多了 `--color-fg-base`、`--color-accent-blue` 等。应只有一个 SSOT。
- **修复**: 删除 `design/system/01-tokens.css`，或将其作为 symlink 指向 renderer 版。

---

## 六、缺失的基础设施

### 6.1 无全局 ErrorBoundary

- **搜索结果**: `grep "ErrorBoundary" apps/desktop/renderer/` — 0 结果（源码中）
- **问题**: 任何未捕获的 React 渲染错误会导致白屏。无降级 UI，无错误报告。
- **修复**: 在 `App.tsx` 中包裹 `<ErrorBoundary>` 组件，显示友好的错误页面（含重试按钮）。

### 6.2 Toast 组件存在但未全局集成

- **文件**:
  - `renderer/src/components/primitives/Toast.tsx` — 组件已实现
  - `renderer/src/components/primitives/Toast.test.tsx` — 测试已通过
  - `renderer/src/components/primitives/Toast.stories.tsx` — Storybook 已展示
- **问题**: Toast 组件存在但在整个应用中**未见任何调用点**。操作成功/失败（如导出完成、AI 应用成功、文件创建）无 Toast 通知。
- **修复**: 创建全局 Toast provider（或使用 Radix Toast），在关键操作完成后触发。

### 6.3 CI 不运行 vitest（46 个组件测试在 CI 中不执行）

- **文件**: `.github/workflows/ci.yml:36-37`
- **现状**: CI 中 `pnpm test:unit` 只执行 `tsx` 手动串联的 10 个测试文件。
- **文件**: `apps/desktop/vitest.config.ts:36` — vitest 配置覆盖 `renderer/src/**/*.test.{ts,tsx}`（46 个文件）
- **问题**: 46 个 renderer 组件测试（包括所有 primitives 和 layout 测试）在 CI 中**完全不执行**。
- **修复**: 在 `ci.yml` 的 `check` job 中添加步骤：
  ```yaml
  - name: Component tests (vitest)
    run: pnpm -C apps/desktop test -- --run
  ```

### 6.4 单元测试手动 tsx 串联执行

- **文件**: `package.json:14` — `test:unit` script
- **现状**:
  ```
  "test:unit": "tsx ...spec.ts && tsx ...test.ts && tsx ...test.ts && ..."
  ```
  10 个测试文件用 `&&` 串联。
- **问题**: 无并行、无覆盖率、无 watch、一个失败阻断后续全部。
- **修复**: 为 main 进程创建独立的 `vitest.config.main.ts`（配置 `environment: "node"`），将 `tests/unit/` 和 `tests/integration/` 纳入 vitest。

### 6.5 Features 目录测试覆盖不均

- **覆盖情况**:
  - `components/primitives/` — 23/24 个组件有测试 ✅
  - `components/layout/` — 7/7 有测试 ✅
  - `features/editor/` — 只有 EditorToolbar 有测试，**EditorPane 无测试** ❌
  - `features/zen-mode/` — 有测试但 ZenMode 是只读组件
  - `features/settings-dialog/` — 无测试 ❌
  - `features/rightpanel/` — 无测试 ❌
  - `features/search/` — 有测试但 SearchPanel 用 mock 数据
  - `features/onboarding/` — 无测试 ❌
  - `features/welcome/` — 无测试 ❌
  - `features/analytics/` — 无测试 ❌

---

## 七、状态管理问题

### 7.1 templateStore 打破全项目架构契约

- **文件**: `renderer/src/stores/templateStore.ts:173`
- **现状**: `export const useTemplateStore = create<TemplateStore>((set, get) => ({` — 全局单例 + 直接 `localStorage`
- **所有其他 store**: `createXxxStore(deps: { invoke })` → Context Provider → DI 注入
- **具体违反**:
  - AGENTS.md "拒绝隐式注入" — 直接访问 `window.localStorage`
  - AGENTS.md "全项目一致性" — 唯一非 DI store
  - 数据安全 — localStorage 清缓存即丢失，其他数据走 SQLite
  - 用 `console.error` 而非结构化 logger（`templateStore.ts:196`, `:206`）
- **修复**:
  1. 改为 `createTemplateStore(deps: { invoke })` 模式
  2. 模板数据通过 IPC 持久化到 SQLite
  3. 在 App.tsx 中添加 `TemplateStoreProvider`

### 7.2 editorStore 和 fileStore bootstrap 逻辑高度重叠

- **文件**:
  - `renderer/src/stores/fileStore.ts:121-207` — `bootstrapForProject`
  - `renderer/src/stores/editorStore.tsx` — `bootstrapForProject`
- **现状**: 两者都做：获取当前文档 → 列表文档 → 没有则创建 → 设为当前。AppShell 串行调用两个 bootstrap。
- **问题**: 各自独立发起相同的 IPC 调用，浪费来回。
- **修复**: 提取公共的 `bootstrapDocuments(projectId)` 逻辑到一个 service/hook 中，两个 store 消费其结果。

### 7.3 Context Provider 嵌套 11 层

- **文件**: `renderer/src/App.tsx:132-155`
- **修复建议**: 创建 `StoreRegistryProvider` 合并所有 store，对外提供 `useStore(storeKey)` 单一入口。

---

## 八、主进程问题

### 8.1 registerIpcHandlers 是 170 行的扁平函数

- **文件**: `main/src/index.ts:123-293`
- **修复**: 按服务域拆分为独立的 `registerXxxHandlers(deps)` 函数，并引入轻量级 service registry。

### 8.2 SearchPanel 使用 MOCK_SEARCH_RESULTS

- **文件**: `renderer/src/features/search/SearchPanel.tsx:29-68`
- **现状**: `export const MOCK_SEARCH_RESULTS: SearchResultItem[]` 包含 5 条硬编码假数据。
- **问题**: 虽然有真实的 `searchStore.runFulltext()`（`SearchPanel.tsx:528`），但搜索面板在无真实结果时展示 mock。且 mock 数据导出为 `export const`，被 stories 引用。
- **修复**: mock 数据应只存在于 `.stories.tsx` 文件中。生产组件应只使用 store 数据。

---

## 九、代码质量问题

### 9.1 console.log/warn/error 在生产代码中

排除 `.stories.tsx` 后，以下生产文件仍有 `console.*`：

| 文件 | 行数 | 调用 |
|-----|------|-----|
| `renderer/src/lib/preferences.ts` | 104,116,123,131 | `console.error` ×4 |
| `renderer/src/features/dashboard/DashboardPage.tsx` | 多处 | `console.log` ×3 |
| `renderer/src/stores/templateStore.ts` | 196,206 | `console.error` ×2 |
| `renderer/src/components/features/KnowledgeGraph/KnowledgeGraph.tsx` | | `console.error` ×1 |
| `renderer/src/features/kg/kgToGraph.ts` | | `console.log` ×3 |
| `renderer/src/features/outline/OutlinePanelContainer.tsx` | | `console.error` ×1 |
| `renderer/src/features/version-history/VersionHistoryContainer.tsx` | | `console.error` ×1 |
| `renderer/src/features/character/characterFromKg.ts` | | `console.error` ×1 |

- **修复**: 替换为结构化 logger 或删除。`preferences.ts` 中的 `console.error` 可保留但应包裹在 `if (import.meta.env.DEV)` 中。

### 9.2 AppShell.tsx 555 行 — 职责过多

- **文件**: `renderer/src/components/layout/AppShell.tsx` (555 行)
- **包含内容**:
  - `extractZenModeContent()` 工具函数 (L41-88)
  - `ZenModeOverlay` 内部组件 (L89-163)
  - `computeSidebarMax` / `computePanelMax` 布局计算 (L165-205)
  - 全部键盘快捷键处理
  - 命令面板回调
  - 所有对话框状态管理
  - 主内容路由分发
- **修复**:
  1. `extractZenModeContent` + `ZenModeOverlay` → 移入 `features/zen-mode/`
  2. `computeSidebarMax/PanelMax` → 移入 `lib/layout.ts`
  3. 键盘快捷键 → 独立的 `useGlobalShortcuts` hook
  4. 对话框状态 → 独立的 `useDialogState` hook

### 9.3 OutlinePanel.tsx 1021 行 — 应拆分

- **文件**: `renderer/src/features/outline/OutlinePanel.tsx` (1021 行)
- **包含**: 8 个图标组件、7 个子组件、3 个工具函数、样式常量、主组件
- **修复**: 拆分为 `OutlineIcons.tsx`、`OutlineItem.tsx`、`OutlineSearch.tsx`、`OutlinePanel.tsx`

### 9.4 ExportDialog 使用 `!important` 覆盖

- **文件**: `renderer/src/features/export/ExportDialog.tsx:721`
- **现状**: `className="!bg-white !text-black hover:!bg-gray-200"`
- **问题**: 使用 Tailwind `!important` 前缀和非 token 颜色值 (`white`, `black`, `gray-200`)
- **修复**: `className="bg-[var(--color-accent)] text-[var(--color-bg-base)] hover:bg-[var(--color-accent-hover)]"`

---

## 十、总结与优先级

### P0 — 阻塞"能用"（7 项）

| # | 问题 | 条目 | 预估工时 |
|---|------|------|---------|
| 1 | AI model 硬编码 `"fake"` | 2.1 | 2h |
| 2 | Anthropic `max_tokens: 256` | 2.2 | 0.5h |
| 3 | ModelPicker UI 与后端断线 | 2.3 | 4h |
| 4 | Migration version 跳跃 | 4.1 | 2h |
| 5 | ZenMode 不可编辑 | 3.6 | 8h |
| 6 | DB 失败无降级 + 无 ErrorBoundary | 4.2+6.1 | 4h |
| 7 | `--color-accent` token 未定义 | 5.2 | 1h |

### P1 — 阻塞"好用"（17 项）

| # | 问题 | 条目 | 预估工时 |
|---|------|------|---------|
| 8 | 编辑器只有 StarterKit | 3.1 | 8h |
| 9 | 编辑器未用规范字体 | 3.2 | 0.5h |
| 10 | IpcInvoke ×8 重复 | 1.1 | 1h |
| 11 | ServiceResult ×23 + ipcError ×24 重复 | 1.2+1.3 | 4h |
| 12 | Tailwind 颜色映射缺失(533 处) | 5.1 | 8h |
| 13 | 112 处硬编码颜色 | 5.3 | 6h |
| 14 | Autosave 竞态+状态不真实 | 3.3+3.4+3.5 | 3h |
| 15 | Store 间无协调 | 7.2 | 4h |
| 16 | templateStore 架构不一致 | 7.1 | 3h |
| 17 | AI feedback 不持久化 | 2.6 | 2h |
| 18 | AI stream 无客户端超时 | 2.7 | 1h |
| 19 | ModePicker 纯装饰 | 2.4 | 1h(移除) |
| 20 | CI 不运行 vitest | 6.3 | 0.5h |
| 21 | 无全局 Toast 集成 | 6.2 | 2h |
| 22 | Path alias 缺失 | 1.5 | 2h |
| 23 | ChatHistory mock 数据 | 2.5 | 1h(标注) |
| 24 | ZenMode 硬编码颜色/字体 | 3.7 | 1h |

### P2 — 提升工程质量（12 项）

| # | 问题 | 条目 | 预估工时 |
|---|------|------|---------|
| 25 | packages/shared 空壳 | 1.4 | 2h |
| 26 | AppShell 555 行拆分 | 9.2 | 3h |
| 27 | OutlinePanel 1021 行拆分 | 9.3 | 2h |
| 28 | 双轨测试系统统一 | 6.4 | 3h |
| 29 | Features 测试覆盖不均 | 6.5 | 8h |
| 30 | console.log 泄露 | 9.1 | 1h |
| 31 | tokens.css 双源 | 5.6 | 0.5h |
| 32 | tokens.css 冗余 accent-* | 5.5 | 0.5h |
| 33 | 11 层 Provider 嵌套 | 7.3 | 4h |
| 34 | registerIpcHandlers 扁平 | 8.1 | 4h |
| 35 | version 表无修剪策略 | 4.3 | 3h |
| 36 | ExportDialog !important | 9.4 | 0.5h |
| 37 | AiPanel 内嵌 style 标签 | 2.8 | 0.5h |
| 38 | SearchPanel mock + 假数据 | 8.2+5.4 | 1h |
| 39 | ZenModeOverlay useMemo 缓存过时 | 3.8 | 1h |

---

## 十一、建议执行顺序

### 第一波（P0，1-2 周）
1. `--color-accent` token 定义 → tokens.css（5.2）— **前置依赖，后续样式修复依赖此 token**
2. AI model/max_tokens 参数化 + ModelPicker 联通（2.1+2.2+2.3）
3. Migration version 跳跃修复（4.1）
4. ErrorBoundary + DB 失败降级（4.2+6.1）
5. ZenMode 改为真实编辑器（3.6+3.7+3.8）

### 第二波（P1 工程基础，1 周）
6. 提取 ServiceResult/IpcInvoke/ipcError 到 shared + path alias（1.1-1.5）
7. Tailwind 颜色映射配置（5.1）
8. CI 添加 vitest（6.3）
9. 统一测试基础设施（6.4）

### 第三波（P1 功能，2-3 周）
10. 编辑器扩展添加（3.1）
11. 编辑器字体对齐规范（3.2）
12. Autosave 竞态修复（3.3-3.5）
13. AI stream 超时 + feedback 持久化（2.6+2.7）
14. 硬编码颜色清理（5.3）
15. templateStore 改 DI + IPC（7.1）
16. ModePicker 移除或标注（2.4）
17. Toast 全局集成（6.2）

### 第四波（P2，持续改进）
18-39. 其余项按表中顺序

---

## 十二、上一版报告 (Opus审计.md) 对比：本次新增发现

| 新发现 | 条目 |
|-------|------|
| ModelPicker UI 存在但与后端完全断线 | 2.3 |
| ModePicker UI 纯装饰 | 2.4 |
| ChatHistory 硬编码 MOCK_HISTORY | 2.5 |
| AiPanel 内嵌 `<style>` 标签 | 2.8 |
| `--color-accent` 核心 token 完全未定义 | 5.2 |
| Tailwind 颜色映射量化 533 处 arbitrary value | 5.1 |
| CI 不运行 vitest（46 个测试不执行） | 6.3 |
| 编辑器未使用设计规范 body 字体 | 3.2 |
| AI feedback 只记日志不持久化 | 2.6 |
| version 表无修剪策略 | 4.3 |
| ZenModeOverlay useMemo 缓存过时 | 3.8 |
| SearchPanel 55 处硬编码颜色 + mock 数据 | 5.3/8.2 |
| OutlinePanel 1021 行 + 硬编码颜色 | 9.3 |
| ExportDialog !important 覆盖 | 9.4 |
| SearchPanel 硬编码 "Search took 0.04s" | 5.4 |
| Toast 组件已实现但未全局集成 | 6.2 |
| ipcError 精确量化为 24 处重复 | 1.3 |
| applySelection.ts 中也有 ipcError 重复 | 1.3 |
| ServiceResult 精确量化为 23 处 | 1.2 |

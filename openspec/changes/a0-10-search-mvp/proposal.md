# Proposal: a0-10-search-mvp

## Why

FTS 后端（`ftsService.ts`）和 SearchPanel 前端都已实现，但 Spec 要求的 `Cmd/Ctrl+Shift+F` 快捷键入口未注册。用户只能从 IconBar 手动打开搜索面板，发现性严重不足。

对创作者来说，"搜索自己写过的内容"是基本需求。

## What Changes

- 注册 `Cmd/Ctrl+Shift+F` 快捷键绑定到 SearchPanel 打开
- 确保搜索结果点击可跳转到对应文档并定位
- 确保快捷键与命令面板中的搜索命令一致

## Scope

- `openspec/specs/search-and-retrieval/spec.md`
- `apps/desktop/renderer/src/config/shortcuts.ts`
- `apps/desktop/renderer/src/surfaces/surfaceRegistry.ts`
- 命令面板注册

## Non-Goals

- 不做跨项目搜索（Spec 中的"Search All Projects"保持占位状态，由 A0-15 处理）
- 不做语义搜索 / RAG（那是 A2-14）
- 不优化 CJK 分词（那是 A1-22）

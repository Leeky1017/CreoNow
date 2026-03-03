# Proposal: issue-941-fe-command-palette-search

更新时间：2026-03-03 16:10

## Why

Command Palette 已具备基础骨架与 i18n 范本价值，但深度审计指出两项核心能力缺失：无文件搜索（仅少量命令项）、搜索匹配仅 `includes`（无 fuzzy match）。

## What Changes

- 新增 `fuzzyMatch.ts`：轻量模糊匹配引擎（字符序列匹配 + 评分排序），零外部依赖
- `CommandPalette.tsx`：`filterCommands()` 从 `includes` 替换为 `fuzzyFilter`
- 文件搜索：接入 projectStore 文件列表作为 CommandItem
- 降级：无文件索引时仅显示命令项，不报错

## Impact

- Affected specs: `openspec/specs/workbench/spec.md`（CommandPalette scenarios）
- Affected code: CommandPalette.tsx（改动）, fuzzyMatch.ts（新增）

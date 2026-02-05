# Design 08 — Performance Plan（memo / virtualization / useShallow）

> Spec: `../spec.md#cnmvp-req-010`
>
> Related cards:
> - `../task_cards/p2/P2-001-react-memo-list-items.md`
> - `../task_cards/p2/P2-002-virtualize-large-lists.md`
> - `../task_cards/p2/P2-003-zustand-useShallow-audit.md`

本文件写死 P2 性能工作的“目标、范围、验证方式”，避免性能优化变成无边界的重构。

## 1) React.memo（列表项）

适用对象：渲染频繁、数量可能很大的列表项。

写死的候选点（基于现有代码结构）：

- Outline：`apps/desktop/renderer/src/features/outline/OutlinePanel.tsx`（`OutlineItemRow` 在文件内，需要先抽组件再 memo）
- Characters：`apps/desktop/renderer/src/features/character/CharacterCard.tsx`（可直接 memo）
- Version history：`apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx`（`VersionCard` 在文件内，需要抽组件再 memo）
- File tree：`apps/desktop/renderer/src/features/files/FileTreePanel.tsx`（items.map 的 row 需要抽组件再 memo）

## 2) 虚拟化（写死库与范围）

虚拟化库选择（写死）：`@tanstack/react-virtual`

范围（写死）：

- OutlinePanel（100+ 项时必须不卡顿）
- VersionHistoryPanel（大量版本时滚动流畅）
- CommandPalette（大量命令时搜索/滚动流畅）
- SearchPanel（大量搜索结果时滚动流畅）

验收（最低要求）：

- 至少一个 smoke：渲染 500 项列表时不超时/不崩溃（可用 story/测试驱动）

## 3) Zustand useShallow

范围：所有 `useStore((s) => ...)` 返回对象/数组且易导致重渲染的 selector。

执行方式：先做一次 `rg \"use.*Store\\(\"` 的清单化，再逐个替换；必须配套测试确保不改变行为。


# ISSUE-132

- Issue: #132
- Branch: task/132-dialog-storybook-fix
- PR: https://github.com/Leeky1017/CreoNow/pull/133

## Plan

1. 为 CharacterDetailDialog 添加 `container` prop 支持
2. 当提供 container 时，使用 `absolute` 定位替代 `fixed`
3. 更新所有包含 Dialog 的 Storybook stories 使用 container ref

## Runs

### 2026-02-03 15:47 实现修复

#### CharacterDetailDialog 修改
- 添加 `container?: HTMLElement | null` prop
- 传递给 `DialogPrimitive.Portal container={container}`
- 创建动态样式函数 `getOverlayStyles` 和 `getContentStyles`
- 当 hasContainer=true 时使用 `absolute` 定位
- 当 hasContainer=false 时保持原有 `fixed` 定位

#### Storybook stories 修改
- 为所有包含 Dialog 的 render 函数添加 `containerRef`
- 将容器 div 添加 `ref={containerRef}` 和 `relative` class
- 将 `container={containerRef.current}` 传递给 CharacterDetailDialog

修改的 stories:
- EditingCharacterFormRender
- AddingPersonalityTraitRender
- ManagingRelationshipsRender (新建)
- UploadingAvatarRender (新建)
- SwitchingBetweenCharactersRender
- ChapterAppearanceNavigationRender

### 验证
- Command: `npx tsc --noEmit`
- Key output: `Exit code: 0` (编译通过)

### 2026-02-03 15:55 调整 Dialog 居中定位

- Command: `Edit apps/desktop/renderer/src/features/character/CharacterDetailDialog.tsx`
- Key output: 移除 `data-[state=open]:translate-y-0` / `data-[state=closed]:translate-y-5`，避免覆盖 `-translate-y-1/2` 导致 Dialog 下移

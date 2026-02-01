# ISSUE-73

- Issue: #73
- Branch: task/73-migrate-high-complexity-components
- PR: https://github.com/Leeky1017/CreoNow/pull/74

## Plan

- 迁移 AiPanel、FileTreePanel、MemoryPanel、KnowledgeGraphPanel 到 Tailwind CSS + 组件库
- 更新 Input/Checkbox/Select 组件支持 forwardRef 和 data-testid 透传
- 验证 TypeScript、ESLint、单元测试、集成测试全部通过

## Runs

### 2026-02-01 迁移实现

- Command: `pnpm tsc --noEmit`
- Key output: `Exit code: 0` (TypeScript 编译通过)

- Command: `pnpm lint`
- Key output: `Exit code: 0` (ESLint 检查通过)

- Command: `pnpm test:unit`
- Key output: `Exit code: 0` (8 个单元测试文件全部通过)

- Command: `pnpm test:integration`
- Key output: `Exit code: 0` (3 个集成测试文件全部通过)

- Evidence: 
  - 迁移文件: `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - 迁移文件: `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
  - 迁移文件: `apps/desktop/renderer/src/features/memory/MemoryPanel.tsx`
  - 迁移文件: `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`
  - 组件增强: `apps/desktop/renderer/src/components/primitives/Input.tsx` (forwardRef)
  - 组件增强: `apps/desktop/renderer/src/components/primitives/Checkbox.tsx` (扩展 props)
  - 组件增强: `apps/desktop/renderer/src/components/primitives/Select.tsx` (扩展 props)

### 质量审计

- 确认所有 `data-testid` 选择器保持稳定（E2E 测试依赖）
- 确认 `ai-stream-toggle` 使用原生 checkbox 以保持 Playwright `.isChecked()` 兼容性
- 确认无内联样式残留（grep 验证）

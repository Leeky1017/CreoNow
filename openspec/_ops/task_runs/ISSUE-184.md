# ISSUE-184

- Issue: #184
- Branch: task/184-surface-registry
- PR: <fill-after-created>

## Plan

- 创建 `surfaceRegistry.ts`：56/56 Storybook 资产全量映射
- 创建 `openSurface.ts`：统一的 Surface 打开/关闭 API
- 创建 `storybook-inventory.spec.ts`：门禁测试

## Runs

### 2026-02-05 实现 Surface Registry + 门禁测试

- Command: `pnpm typecheck && pnpm lint && pnpm test:unit`
- Key output:
  ```
  ✅ TypeScript 类型检查通过
  ✅ ESLint 通过（无新增错误）
  ✅ 单元测试通过
  
  🔍 Storybook Inventory Check
  ============================
  Found 56 story files
  
  📊 Statistics:
     Stories found:     56
     Registry entries:  56
  
  📁 By Category:
     Layout:     7 stories / 7 registry
     Primitives: 23 stories / 23 registry
     Features:   26 stories / 26 registry
  
  ✅ All stories are mapped in the registry!
     Total: 56/56
  ```
- Evidence:
  - 新增文件：
    - `apps/desktop/renderer/src/surfaces/surfaceRegistry.ts`
    - `apps/desktop/renderer/src/surfaces/openSurface.ts`
    - `apps/desktop/renderer/src/surfaces/index.ts`
    - `apps/desktop/tests/unit/storybook-inventory.spec.ts`
  - 修改文件：
    - `package.json`（test:unit 添加新测试）

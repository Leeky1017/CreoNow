# RUN_LOG: ISSUE-459 — API Key 配置与 AI 设置面板

## Metadata

- **Issue**: #459
- **Change**: `api-key-settings`
- **Branch**: `task/459-api-key-settings`
- **PR**: (pending)

## Runs

### Red Phase

```
$ pnpm vitest run renderer/src/features/ai/__tests__/AiNotConfiguredGuide.test.tsx
Cannot find module '../AiNotConfiguredGuide'

$ pnpm vitest run renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx
Cannot find module '../AiSettingsSection'
```

**Result**: Both test files fail — modules do not exist. ✅ Red confirmed.

### Green Phase

Implemented:
- `AiNotConfiguredGuide.tsx` — 无 API Key 时的引导组件（含"前往设置"按钮）
- `AiSettingsSection.tsx` — AI 配置区组件（Provider 选择、API Key 输入、Base URL、连接测试）

```
$ pnpm vitest run --reporter=verbose \
  renderer/src/features/ai/__tests__/AiNotConfiguredGuide.test.tsx \
  renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx

 ✓ AiNotConfiguredGuide > renders when no API key configured
 ✓ AiNotConfiguredGuide > has settings navigation button
 ✓ AiNotConfiguredGuide > calls onNavigateToSettings when button clicked
 ✓ AiNotConfiguredGuide > shows guidance text about API key
 ✓ AiSettingsSection > renders provider mode selector
 ✓ AiSettingsSection > renders API Key input field
 ✓ AiSettingsSection > shows configured state when apiKeyConfigured is true
 ✓ AiSettingsSection > calls ai:config:test on test button click
 ✓ AiSettingsSection > shows success result with latency
 ✓ AiSettingsSection > shows error result on test failure

 Test Files  2 passed (2)
      Tests  10 passed (10)
```

**Result**: All 10 tests pass. ✅ Green confirmed.

### Refactor Phase

- `AiSettingsSection` follows existing `ProxySection` patterns
- `AiNotConfiguredGuide` uses project design primitives (Card, Text, Button)
- API Key placeholder shows "已配置"/"未配置" based on backend state

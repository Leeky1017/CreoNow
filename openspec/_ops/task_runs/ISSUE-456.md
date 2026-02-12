# RUN_LOG: ISSUE-456 — AI 身份提示词与分层组装

## Metadata

- Issue: #456
- Change: ai-identity-prompt
- Branch: task/456-ai-identity-prompt
- PR: https://github.com/Leeky1017/CreoNow/pull/463

## Plan

1. Red: 编写 identityPrompt.test.ts + assembleSystemPrompt.test.ts
2. Green: 实现 identityPrompt.ts + assembleSystemPrompt.ts
3. Refactor: 集成到 aiService.ts，注册测试

## Runs

### Red Phase

```
$ npx tsx apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts
ERR_MODULE_NOT_FOUND: Cannot find module '../identityPrompt'

$ npx tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts
ERR_MODULE_NOT_FOUND: Cannot find module '../assembleSystemPrompt'
```

**Result**: Both tests fail — modules do not exist yet. ✅ Red confirmed.

### Green Phase

Implemented:
- `identityPrompt.ts` — GLOBAL_IDENTITY_PROMPT constant with 5 XML blocks
- `assembleSystemPrompt.ts` — layered assembly function (identity → userRules → skill → mode → memory → context)
- `aiService.ts` — import + re-export for downstream consumers

```
$ npx tsx apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts && \
  npx tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts && \
  echo "ALL PASS"
ALL PASS
```

**Result**: All assertions pass. ✅ Green confirmed.

### Refactor Phase

- Kept `combineSystemText` as-is for backward compatibility (4 internal call sites)
- Added `assembleSystemPrompt` + `GLOBAL_IDENTITY_PROMPT` as new exports from aiService
- Full migration of internal call sites deferred to Change 3 (multi-turn-conversation)
- Registered tests in `test:unit` script

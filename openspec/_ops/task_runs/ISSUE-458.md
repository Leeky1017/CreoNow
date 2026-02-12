# RUN_LOG: ISSUE-458 — 多轮对话消息管理

## Metadata

- Issue: #458
- Change: multi-turn-conversation
- Branch: task/458-multi-turn-conversation
- PR: https://github.com/Leeky1017/CreoNow/pull/463

## Plan

1. Red: 编写 chatMessageManager.test.ts + buildLLMMessages.test.ts
2. Green: 实现 chatMessageManager.ts + buildLLMMessages.ts
3. Refactor: 注册测试

## Runs

### Red Phase

```
$ npx tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts
ERR_MODULE_NOT_FOUND: Cannot find module '../chatMessageManager'

$ npx tsx apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts
ERR_MODULE_NOT_FOUND: Cannot find module '../buildLLMMessages'
```

**Result**: Both tests fail — modules do not exist. ✅ Red confirmed.

### Green Phase

Implemented:
- `chatMessageManager.ts` — ChatMessage type + createChatMessageManager (add/clear/getMessages)
- `buildLLMMessages.ts` — buildLLMMessages (system + history + current) + estimateMessageTokens + token budget trimming

```
$ npx tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts && \
  npx tsx apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts && \
  echo "ALL PASS"
ALL PASS
```

**Result**: All assertions pass. ✅ Green confirmed.

### Refactor Phase

- `estimateMessageTokens` matches aiService.ts `estimateTokenCount` algorithm (UTF-8 byte / 4)
- `getMessages()` returns defensive copies
- Registered tests in `test:unit` script

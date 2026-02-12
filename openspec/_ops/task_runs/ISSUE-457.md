# RUN_LOG: ISSUE-457 — Chat 技能与智能路由

## Metadata

- Issue: #457
- Change: chat-skill
- Branch: task/457-chat-skill
- PR: https://github.com/Leeky1017/CreoNow/pull/463

## Plan

1. Red: 编写 skillRouter.test.ts + chatSkill.test.ts
2. Green: 实现 chat SKILL.md + skillRouter.ts
3. Refactor: 提取关键词表为常量，注册测试

## Runs

### Red Phase

```
$ npx tsx apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts
ERR_MODULE_NOT_FOUND: Cannot find module '../skillRouter'

$ npx tsx apps/desktop/main/src/services/skills/__tests__/chatSkill.test.ts
ENOENT: no such file or directory — chat/SKILL.md
```

**Result**: Both tests fail — modules/files do not exist. ✅ Red confirmed.

### Green Phase

Implemented:
- `skills/chat/SKILL.md` — chat 技能定义（builtin:chat, kind: single, scope: builtin）
- `skillRouter.ts` — `inferSkillFromInput` 函数（关键词匹配 + 上下文启发式 + 默认 chat）

```
$ npx tsx apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts && \
  npx tsx apps/desktop/main/src/services/skills/__tests__/chatSkill.test.ts && \
  echo "ALL PASS"
ALL PASS
```

**Result**: All assertions pass. ✅ Green confirmed.

### Refactor Phase

- Keyword rules extracted as `KEYWORD_RULES` constant array
- `inferSkillFromInput` is a pure function with no side effects
- Registered tests in `test:unit` script

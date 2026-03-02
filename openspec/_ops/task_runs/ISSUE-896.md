# RUN_LOG: ISSUE-896 — ZenMode token escape cleanup

更新时间：2026-03-02 11:20

## Meta

| 字段 | 值 |
|------|-----|
| Issue | #896 |
| Branch | `task/896-zenmode-token-escape-cleanup` |
| Change | `fe-zenmode-token-escape-cleanup` |
| PR | 待回填 |

## Dependency Sync Check

- 上游：`openspec/specs/editor/spec.md` — 无变更，无漂移 ✅
- 结论：N/A，无上游 change 依赖

## Runs

### Red 阶段

```
pnpm -C apps/desktop test:run features/zen-mode/__tests__/zenmode-token-escape.guard

 FAIL  zenmode-token-escape.guard.test.ts (4 tests | 4 failed)
   × ZenMode.tsx contains no raw rgba values (ED-FE-ZEN-S1) — L142 rgba(255,255,255,0.05)
   × ZenMode.tsx contains no magic pixel values (ED-FE-ZEN-S2) — 5 处魔法值
   × ZenModeStatus.tsx contains no raw rgba values (ED-FE-ZEN-S3) — L57 rgba(0,0,0,0.5)
   × tokens.css defines all required zen-mode tokens (ED-FE-ZEN-S4) — 9 个 token 缺失
```

### Green 阶段

```
pnpm -C apps/desktop test:run features/zen-mode/__tests__/zenmode-token-escape.guard

 ✓ zenmode-token-escape.guard.test.ts (4 tests)
   ✓ ZenMode.tsx contains no raw rgba values (ED-FE-ZEN-S1)
   ✓ ZenMode.tsx contains no magic pixel values (ED-FE-ZEN-S2)
   ✓ ZenModeStatus.tsx contains no raw rgba values (ED-FE-ZEN-S3)
   ✓ tokens.css defines all required zen-mode tokens (ED-FE-ZEN-S4)
```

### 全量回归

```
pnpm -C apps/desktop test:run

 Test Files  214 passed (214)
      Tests  1631 passed (1631)
```

### Typecheck

```
pnpm -C apps/desktop typecheck
> tsc -p tsconfig.json --noEmit
(exit 0)
```

## 变更文件

| 文件 | 操作 |
|------|------|
| `apps/desktop/renderer/src/features/zen-mode/__tests__/zenmode-token-escape.guard.test.ts` | 新建 — 4 条 guard 测试 |
| `apps/desktop/renderer/src/styles/tokens.css` | 修改 — 新增 9 个 zen-mode token |
| `apps/desktop/renderer/src/features/zen-mode/ZenMode.tsx` | 修改 — rgba hover → var(), 7 处魔法值替换 |
| `apps/desktop/renderer/src/features/zen-mode/ZenModeStatus.tsx` | 修改 — rgba → var() |

## Main Session Audit

待独立审计完成后补充。

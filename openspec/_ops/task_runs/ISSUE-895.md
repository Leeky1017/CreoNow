# RUN_LOG: ISSUE-895 — SearchPanel tokenized rewrite

更新时间：2026-03-02 12:15

## Meta

| 字段 | 值 |
|------|-----|
| Issue | #895 |
| Branch | `task/895-searchpanel-tokenized-rewrite` |
| Change | `fe-searchpanel-tokenized-rewrite` |
| PR | https://github.com/Leeky1017/CreoNow/pull/898 |

## Dependency Sync Check

- `fe-hotfix-searchpanel-backdrop-close`：已归档（PR #798），关闭语义稳定 ✅
- `fe-composites-p0-panel-and-command-items`：已归档，PanelContainer/CommandItem 可用 ✅
- 结论：无漂移

## Runs

### Red 阶段（S1/S1b/S3）

```
pnpm -C apps/desktop test:run features/search/SearchPanel.token-guard

 FAIL  SearchPanel.token-guard.test.ts (4 tests | 4 failed)
   × does not contain raw hex color values (WB-FE-SRCH-S1)    — 56 violations
   × does not contain raw rgba values (WB-FE-SRCH-S1)         — 多处 rgba()
   × does not contain inline style attributes (WB-FE-SRCH-S1b) — 6 个 style={{}}
   × does not use transition-all (WB-FE-SRCH-S3)              — 5 处 transition-all
```

### Green 阶段（S1/S1b/S3）

```
pnpm -C apps/desktop test:run features/search/SearchPanel.token-guard

 ✓ SearchPanel.token-guard.test.ts (4 tests) 4ms
   ✓ does not contain raw hex color values (WB-FE-SRCH-S1)
   ✓ does not contain raw rgba values (WB-FE-SRCH-S1)
   ✓ does not contain inline style attributes (WB-FE-SRCH-S1b)
   ✓ does not use transition-all (WB-FE-SRCH-S3)
```

### Red 阶段（S2/S3b）— 审计后补充

```
pnpm -C apps/desktop test:run features/search/SearchPanel.token-guard

 FAIL  SearchPanel.token-guard.test.ts (6 tests | 2 failed)
   ✓ does not contain raw hex color values (WB-FE-SRCH-S1)
   ✓ does not contain raw rgba values (WB-FE-SRCH-S1)
   ✓ does not contain inline style attributes (WB-FE-SRCH-S1b)
   ✓ does not use transition-all (WB-FE-SRCH-S3)
   × does not contain native <button or <input elements (WB-FE-SRCH-S2)
     — 11 处 native <button>/<input>
   × gates animations with motion-safe modifier (WB-FE-SRCH-S3b)
     — 3 处未加 motion-safe: 前缀的 animate-*
```

### Green 阶段（S2/S3b）— 审计后补充

```
pnpm -C apps/desktop test:run features/search/SearchPanel.token-guard

 ✓ SearchPanel.token-guard.test.ts (6 tests) 5ms
   ✓ does not contain raw hex color values (WB-FE-SRCH-S1)
   ✓ does not contain raw rgba values (WB-FE-SRCH-S1)
   ✓ does not contain inline style attributes (WB-FE-SRCH-S1b)
   ✓ does not use transition-all (WB-FE-SRCH-S3)
   ✓ does not contain native <button or <input elements (WB-FE-SRCH-S2)
   ✓ gates animations with motion-safe modifier (WB-FE-SRCH-S3b)
```

### 全量回归

```
pnpm -C apps/desktop test:run

 Test Files  214 passed (214)
      Tests  1633 passed (1633)
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
| `apps/desktop/renderer/src/features/search/SearchPanel.token-guard.test.ts` | 修改 — 6 个 guard 测试（+2 S2/S3b） |
| `apps/desktop/renderer/src/features/search/SearchPanel.tsx` | 修改 — token 替换 + 原生元素 → Primitives + motion-safe |
| `apps/desktop/renderer/src/features/search/SearchPanel.test.tsx` | 修改 — 适配 Button primitive 内 span 包装 |

## Main Session Audit

| 字段 | 值 |
|------|-----|
| Audit-Owner | 待独立审计员指派 |
| Reviewed-HEAD-SHA | 待 push 后更新 |
| Spec-Compliance | S1 ✅ S1b ✅ S2 ✅ S3 ✅ S3b ✅ |
| Code-Quality | Typecheck ✅ · 全量回归 214/214 ✅ |
| Fresh-Verification | 审计后补充 S2/S3b 完成，全量回归已通过 |
| Blocking-Issues | 无 |
| Decision | 待审计员决定 |

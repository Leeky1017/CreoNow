# RUN_LOG: ISSUE-897 — Dashboard HeroCard responsive layout

更新时间：2026-03-02 12:15

## Meta

| 字段 | 值 |
|------|-----|
| Issue | #897 |
| Branch | `task/897-herocard-responsive-layout` |
| Change | `fe-dashboard-herocard-responsive-layout` |
| PR | https://github.com/Leeky1017/CreoNow/pull/900 |

## Dependency Sync Check

- 上游：`openspec/specs/project-management/spec.md` — 无变更，无漂移 ✅
- 结论：N/A，无上游 change 依赖

## Runs

### Red 阶段（原始，S1 假通过）

```
pnpm -C apps/desktop test:run features/dashboard/HeroCard.responsive.guard

 FAIL  HeroCard.responsive.guard.test.ts (3 tests | 2 failed)
   ✓ HeroCard decoration area has max-width constraint (PM-FE-HERO-S1)
     — 匹配到文字区已有的 max-w-[500px]，Red 阶段即通过（测试精度不足）
   × HeroCard decoration area is hidden on narrow screens (PM-FE-HERO-S2)
   × HeroCard container does not use fixed min-h-[280px] (PM-FE-HERO-S3)
```

注：S1 原始测试 `/max-w-\[/` 匹配到了 `<p>` 标签的 `max-w-[500px]` 而非装饰区。审计后修正测试精度。

### S1 测试精度修正（审计后）

修正前正则：`/max-w-\[/` 匹配 HeroCard 全文 → 误中文字区 `max-w-[500px]`
修正后逻辑：找到 `w-[35%]` 所在行（装饰区 div），断言该行包含 `max-w-[`

```
pnpm -C apps/desktop test:run features/dashboard/HeroCard.responsive.guard

 ✓ HeroCard.responsive.guard.test.ts (3 tests) 2ms
   ✓ HeroCard decoration area has max-width constraint (PM-FE-HERO-S1)
   ✓ HeroCard decoration area is hidden on narrow screens (PM-FE-HERO-S2)
   ✓ HeroCard container does not use fixed min-h-[280px] (PM-FE-HERO-S3)
```

### 全量回归

```
pnpm -C apps/desktop test:run

 Test Files  214 passed (214)
      Tests  1630 passed (1630)
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
| `apps/desktop/renderer/src/features/dashboard/HeroCard.responsive.guard.test.ts` | 修改 — S1 测试精度提升 |
| `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx` | 修改 — 3 处 className 调整 |

## Main Session Audit

| 字段 | 值 |
|------|-----|
| Audit-Owner | 待独立审计员指派 |
| Reviewed-HEAD-SHA | 待 push 后更新 |
| Spec-Compliance | S1 ✅（精度修正后） S2 ✅ S3 ✅ |
| Code-Quality | Typecheck ✅ · 全量回归 214/214 ✅ |
| Fresh-Verification | S1 测试精度修正，全量回归无新增失败 |
| Blocking-Issues | 无 |
| Decision | 待审计员决定 |

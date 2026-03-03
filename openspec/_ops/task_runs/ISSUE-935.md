# ISSUE-935 — fe-editor-inline-diff-decoration-integration

| Field   | Value |
|---------|-------|
| Issue   | #935 |
| Branch  | `task/935-fe-editor-inline-diff` |
| PR      | 待回填 |
| Agent   | editor-diff-agent |

## Dependency Sync Check

- `fe-leftpanel-dialog-migration`：已归档完成（PR #808）。无漂移。

## Runs

### Run 1 — Red 阶段

```
$ pnpm -C apps/desktop test:run features/editor/__tests__/inlineDiff.decoration

 ✓ VC-FE-DIFF-S1: createInlineDiffDecorations returns decoration data (2)
 ❯ VC-FE-DIFF-S2: InlineDiffExtension produces ProseMirror DecorationSet when diff data is provided (1)
     × produces decorations when diff data is injected via storage
       TypeError: Cannot set properties of undefined (setting 'diffs')
 ❯ VC-FE-DIFF-S3: InlineDiffExtension clears decorations when diff data is removed (1)
     × has empty DecorationSet after clearing diff data
       TypeError: Cannot set properties of undefined (setting 'diffs')
 ❯ VC-FE-DIFF-S4: decoration uses semantic token classes for insert/delete (1)
     × decorations include inline-diff-added and inline-diff-removed classes
       TypeError: Cannot set properties of undefined (setting 'diffs')

 Test Files  1 failed (1)
      Tests  3 failed | 2 passed (5)
```

红灯原因：InlineDiffExtension 是空壳对象，无 TipTap storage/plugin。

### Run 2 — Green 阶段

```
$ pnpm -C apps/desktop test:run features/editor/__tests__/inlineDiff.decoration

 ✓ VC-FE-DIFF-S1 (2) ✓
 ✓ VC-FE-DIFF-S2 (1) ✓
 ✓ VC-FE-DIFF-S3 (1) ✓
 ✓ VC-FE-DIFF-S4 (1) ✓

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

### Run 3 — 全量回归

```
$ pnpm -C apps/desktop test:run

 Test Files  236 passed (236)
      Tests  1716 passed (1716)
   Duration  44.10s
```

### Run 4 — Typecheck

```
$ pnpm typecheck
> tsc --noEmit
（无错误，正常退出）
```

### Run 5 — 向后兼容检查

```
$ pnpm -C apps/desktop test:run InlineDiffControls

 ✓ InlineDiffControls (3)
   ✓ S2-ID-1 ✓
   ✓ S2-ID-2 ✓
   ✓ S2-ID-3 ✓

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

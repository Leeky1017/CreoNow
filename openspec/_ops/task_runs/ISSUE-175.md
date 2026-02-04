# RUN_LOG: Issue #175 - Remove ContextViewer Component

## Metadata

| Field     | Value                                              |
| --------- | -------------------------------------------------- |
| Issue     | #175                                               |
| Branch    | `task/175-remove-context-viewer`                   |
| PR        | #176                                               |
| Status    | In Progress                                        |

## Plan

1. Delete ContextViewer component and related files
2. Delete contextStore.ts
3. Delete context-viewer-redaction.spec.ts E2E test
4. Remove contextStore from provider tree (App.tsx)
5. Remove contextStore from all test wrappers and stories
6. Update AiPanel.tsx to remove contextStore dependency
7. Update E2E tests to remove ai-context-* assertions
8. Verify TypeScript compiles
9. Run unit tests
10. Create PR and run CI

## Runs

### Run 1: 2026-02-04

**Action**: Full implementation

**Files deleted**:
- `apps/desktop/renderer/src/features/ai/ContextViewer.tsx`
- `apps/desktop/renderer/src/features/ai/ContextViewer.test.tsx`
- `apps/desktop/renderer/src/features/ai/ContextViewer.stories.tsx`
- `apps/desktop/renderer/src/stores/contextStore.ts`
- `apps/desktop/tests/e2e/context-viewer-redaction.spec.ts`

**Files modified**:
- `apps/desktop/renderer/src/App.tsx` - Removed contextStore provider
- `apps/desktop/renderer/src/features/ai/AiPanel.tsx` - Removed contextStore dependency
- `apps/desktop/renderer/src/features/ai/AiPanel.test.tsx` - Removed mock
- `apps/desktop/renderer/src/components/layout/test-utils.tsx`
- `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
- `apps/desktop/renderer/src/components/layout/AppShell.stories.tsx`
- `apps/desktop/renderer/src/components/layout/Layout.test.tsx`
- `apps/desktop/renderer/src/components/layout/Layout.stories.tsx`
- `apps/desktop/renderer/src/__integration__/dashboard-editor-flow.test.tsx`
- `apps/desktop/tests/e2e/search-rag.spec.ts` - Removed ai-context-* assertions
- `apps/desktop/tests/e2e/knowledge-graph.spec.ts` - Removed ai-context-* assertions
- `apps/desktop/tests/e2e/memory-semantic-recall.spec.ts` - Removed ai-context-* assertions

**Verification**:
- TypeScript compiles: ✅
- Unit tests: ✅ (1209 tests passed)
- PR created: #176

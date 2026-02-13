## 1. Implementation

- [x] 1.1 Implement `createRetrievedFetcher` for `when_detected` entity injection.
- [x] 1.2 Wire retrieved default fetcher in `layerAssemblyService` with C10 matcher dependency.
- [x] 1.3 Add `apps/desktop/.env.example` for LLM/agent local testing.

## 2. Testing

- [x] 2.1 Add S1-S5 tests in `retrievedFetcher.test.ts` and capture Red failure.
- [x] 2.2 Verify Green with target test + context regression checks + desktop typecheck.

## 3. Documentation

- [x] 3.1 Update OpenSpec change task checklist/evidence (`p2-fetcher-detected/tasks.md`).
- [ ] 3.2 Complete RUN_LOG PR link backfill and archive task after merge.

## 1. Specification

- [x] 1.1 Define classification semantics for gate failures
- [x] 1.2 Define safe autofix scope and branch guard
- [x] 1.3 Define CI check-only invariant

## 2. TDD Mapping（先测前提）

- [x] 2.1 Map S1-S6 to unit tests
- [x] 2.2 Require Red evidence before implementation
- [x] 2.3 Require deterministic assertions for classification and commit behavior

## 3. Red（先写失败测试）

- [x] 3.1 Add failing tests for classification
- [x] 3.2 Add failing tests for safe autofix apply
- [x] 3.3 Add failing tests for auto-commit guard

## 4. Green（最小实现通过）

- [x] 4.1 Implement classification output and unexpected-item detection
- [x] 4.2 Implement autofix apply + optional commit flow
- [x] 4.3 Wire npm scripts and docs

## 5. Refactor（保持绿灯）

- [x] 5.1 Stabilize output format and helper utilities
- [x] 5.2 Reduce duplicated parsing logic

## 6. Evidence

- [x] 6.1 Capture RUN_LOG with Red/Green proof
- [x] 6.2 Capture dependency sync notes
- [ ] 6.3 Capture CI green and merged PR

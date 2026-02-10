# Spec Delta Reference: context-engine (ISSUE-366)

## Scope

Apply `openspec/changes/context-engine-p2-stable-prefix-hash` with strict TDD evidence:

- 固化 `Rules + Settings` 的确定性 SHA-256 计算规则。
- 固化 canonicalize 行为：稳定键排序、`constraints` 排序、非确定字段剔除。
- 固化 `stablePrefixUnchanged` 命中/失效语义与判定维度。

## Scenario Mapping

- CE3-R1-S1 → `apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
- CE3-R1-S2 → `apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`

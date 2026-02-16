# Active Changes Execution Order

更新时间：2026-02-16 12:01

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **22**。
- 执行模式：**分波次并行 + 依赖串行收敛**。
- 基线规则：
  - 进入 Red 前必须完成依赖同步检查（Dependency Sync Check）。
  - 若发现依赖漂移，必须先更新 proposal/spec/tasks 与本文件，再继续实现。

## 执行顺序

1. `aud-c1a-renderer-safeinvoke-contract`
2. `aud-c2a-test-runner-discovery`
3. `aud-c3a-ipc-session-project-binding`
4. `aud-h1-export-stream-write`
5. `aud-h2a-main-hotpath-async-io`
6. `aud-h3-watcher-error-recovery-state`
7. `aud-h5-preload-payload-size-protocol`
8. `aud-m1-ai-runtime-config-centralization`
9. `aud-m2-shared-token-budget-helper`
10. `aud-c1b-renderer-async-state-convergence`
11. `aud-c2b-main-unit-suite-inclusion`
12. `aud-c3b-ipc-assert-project-access`
13. `aud-h2b-main-io-offload-guard`
14. `aud-h4-judge-eval-retry-safety`
15. `aud-m3-test-token-estimator-parity`
16. `aud-m4-preload-diagnostic-metadata`
17. `aud-c1c-renderer-fireforget-lint-guard`
18. `aud-c2c-executed-vs-discovered-gate`
19. `aud-h6a-main-service-decomposition`
20. `aud-m5-coverage-gate-artifacts`
21. `aud-h6b-memory-document-decomposition`
22. `aud-h6c-renderer-shell-decomposition`

## 依赖说明

- `aud-c1b-renderer-async-state-convergence` 依赖 `aud-c1a-renderer-safeinvoke-contract`。
- `aud-c1c-renderer-fireforget-lint-guard` 依赖 `aud-c1a-renderer-safeinvoke-contract`、`aud-c1b-renderer-async-state-convergence`。
- `aud-c2b-main-unit-suite-inclusion` 依赖 `aud-c2a-test-runner-discovery`。
- `aud-c2c-executed-vs-discovered-gate` 依赖 `aud-c2a-test-runner-discovery`、`aud-c2b-main-unit-suite-inclusion`。
- `aud-c3b-ipc-assert-project-access` 依赖 `aud-c3a-ipc-session-project-binding`。
- `aud-h2b-main-io-offload-guard` 依赖 `aud-h2a-main-hotpath-async-io`。
- `aud-h4-judge-eval-retry-safety` 依赖 `aud-c1a-renderer-safeinvoke-contract`。
- `aud-h6a-main-service-decomposition` 依赖 `aud-c1a-renderer-safeinvoke-contract`、`aud-c3b-ipc-assert-project-access`。
- `aud-h6b-memory-document-decomposition` 依赖 `aud-h6a-main-service-decomposition`。
- `aud-h6c-renderer-shell-decomposition` 依赖 `aud-h6a-main-service-decomposition`。
- `aud-m3-test-token-estimator-parity` 依赖 `aud-m2-shared-token-budget-helper`。
- `aud-m4-preload-diagnostic-metadata` 依赖 `aud-h5-preload-payload-size-protocol`。
- `aud-m5-coverage-gate-artifacts` 依赖 `aud-c2c-executed-vs-discovered-gate`。

## 波次并行建议

- Wave 0（并行基础层）：`aud-c1a`、`aud-c2a`、`aud-c3a`、`aud-h1`、`aud-h2a`、`aud-h3`、`aud-h5`、`aud-m1`、`aud-m2`
- Wave 1（依赖收敛层）：`aud-c1b`、`aud-c2b`、`aud-c3b`、`aud-h2b`、`aud-h4`、`aud-m3`、`aud-m4`
- Wave 2（治理门禁层）：`aud-c1c`、`aud-c2c`、`aud-h6a`、`aud-m5`
- Wave 3（架构拆分层）：`aud-h6b`、`aud-h6c`

## 进度快照

- Wave 0：已完成并合并（PR #590）。
- Wave 1：已完成并合并（PR #592）。
- Wave 2：issue #593 已完成实现与本地门禁验证（`aud-c1c/c2c/h6a/m5`），进入审计与治理收口（Rulebook/RUN_LOG/preflight/PR）。
- Wave 3：依赖 Wave2 的 `aud-h6a` 合并后推进（`aud-h6b/h6c`）。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。

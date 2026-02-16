# CN 审计问题 Change 拆解与 Owner 审批记录（2026-02-16）

来源审计文档：`docs/CN-全量代码严格审计报告-2026-02-15-第二轮.md`

## 1. 审批标准（Lead 代 Owner）

- 颗粒度：每个 change 必须是可独立实现、可独立验证、可独立回滚的最小单元。
- 覆盖性：C1-C3 / H1-H6 / M1-M5 必须全部被映射，零遗漏。
- 结构合规：`proposal.md`、`specs/*/spec.md`、`tasks.md` 缺一不可。
- TDD 合规：`tasks.md` 必须满足 6 段固定顺序。
- 依赖合规：有上游依赖的 change 必须声明 Dependency Sync Check 要求。
- 执行合规：`openspec/changes/EXECUTION_ORDER.md` 必须维护完整拓扑。

## 2. 驳回与修订记录

- Round 1（驳回）
  - 问题：批量生成文档时出现模板渲染异常，部分 proposal 文本不合规。
  - 处理：全量重写 22 个 change 文档并执行结构校验。
- Round 2（通过）
  - 校验结果：文件完整性 + TDD 结构 + 依赖同步关键字全部通过。

## 3. 审计问题到 Change 映射

| 审计项                           | Change 拆解                                                                                                                    | 审批结论 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| C1 渲染层异步失败不落地          | `aud-c1a-renderer-safeinvoke-contract` / `aud-c1b-renderer-async-state-convergence` / `aud-c1c-renderer-fireforget-lint-guard` | PASS     |
| C2 测试门禁虚假覆盖率            | `aud-c2a-test-runner-discovery` / `aud-c2b-main-unit-suite-inclusion` / `aud-c2c-executed-vs-discovered-gate`                  | PASS     |
| C3 IPC 项目作用域授权不足        | `aud-c3a-ipc-session-project-binding` / `aud-c3b-ipc-assert-project-access`                                                    | PASS     |
| H1 导出内存峰值风险              | `aud-h1-export-stream-write`                                                                                                   | PASS     |
| H2 主进程同步 I/O 阻塞           | `aud-h2a-main-hotpath-async-io` / `aud-h2b-main-io-offload-guard`                                                              | PASS     |
| H3 watcher 错误不可观测          | `aud-h3-watcher-error-recovery-state`                                                                                          | PASS     |
| H4 Judge 失败不可重试            | `aud-h4-judge-eval-retry-safety`                                                                                               | PASS     |
| H5 preload 大 payload 序列化开销 | `aud-h5-preload-payload-size-protocol`                                                                                         | PASS     |
| H6 架构单体回归                  | `aud-h6a-main-service-decomposition` / `aud-h6b-memory-document-decomposition` / `aud-h6c-renderer-shell-decomposition`        | PASS     |
| M1 AI runtime 参数硬编码         | `aud-m1-ai-runtime-config-centralization`                                                                                      | PASS     |
| M2 Token 预算重复逻辑            | `aud-m2-shared-token-budget-helper`                                                                                            | PASS     |
| M3 测试 token mock 口径偏差      | `aud-m3-test-token-estimator-parity`                                                                                           | PASS     |
| M4 preload 诊断信息不足          | `aud-m4-preload-diagnostic-metadata`                                                                                           | PASS     |
| M5 覆盖率门禁缺失                | `aud-m5-coverage-gate-artifacts`                                                                                               | PASS     |

## 4. 最终审批结论

- 审批状态：**全部通过（22/22）**
- 说明：所有 change 已达到“可实施、可验证、可编排”的准入标准，可进入实现派工阶段。

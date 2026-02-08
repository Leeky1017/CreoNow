## 1. Specification

- [ ] 1.1 确认本 change 仅覆盖 3 个 requirement（不超过 3 个）。
- [ ] 1.2 确认前置依赖 `document-management-p1-file-tree-organization` 与 `document-management-p1-reference-and-export` 已归档。
- [ ] 1.3 确认强制覆盖点已写入 delta spec：容量上限、编码异常、并发冲突、性能阈值、队列背压、路径越权阻断。
- [ ] 1.4 确认本 change 为 OpenSpec-only，不进入代码实现。
- [ ] 1.5 确认主 spec 不改动，仅通过 delta spec 承载 P2 约束。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注 Scenario ID 与目标测试文件，保证可追踪。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。
- [ ] 2.4 所有边界/异常 Scenario 已完成测试映射。

### Scenario -> Test 映射

- [ ] DM-P2-HG-S1 `超容量文档写入被阻断并返回容量错误码 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-capacity-and-encoding.test.ts`
  - 用例：`should reject write when document bytes exceed 5 MiB and return DOCUMENT_CAPACITY_LIMIT_EXCEEDED`
- [ ] DM-P2-HG-S2 `编码异常输入被拒绝并返回可判定错误 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-capacity-and-encoding.test.ts`
  - 用例：`should reject invalid encoding payload and return DOCUMENT_ENCODING_INVALID`
- [ ] DM-P2-HG-S3 `并发编辑冲突返回最新版本元信息 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-conflict-and-path-guard.test.ts`
  - 用例：`should detect stale baseRevision and return DOCUMENT_CONFLICT_DETECTED with latest revision metadata`
- [ ] DM-P2-HG-S4 `路径越权访问被阻断 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-conflict-and-path-guard.test.ts`
  - 用例：`should block traversal or symlink escape outside project root with DOCUMENT_PATH_TRAVERSAL_BLOCKED`
- [ ] DM-P2-GATE-S1 `容量与性能阈值具备可执行门禁 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-performance-and-backpressure.test.ts`
  - 用例：`should keep read/save p95 under thresholds for <=1 MiB documents in deterministic benchmark harness`
- [ ] DM-P2-GATE-S2 `队列背压触发与恢复可验证 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-performance-and-backpressure.test.ts`
  - 用例：`should return DOCUMENT_QUEUE_BACKPRESSURE when pending writes exceed 32 and recover after drain`
- [ ] DM-P2-GATE-S3 `路径越权阻断纳入模块级验收门禁 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-conflict-and-path-guard.test.ts`
  - 用例：`should enforce root-bounded path policy for save/export/import operations`
- [ ] DM-P2-MAT-S1 `异常与边界覆盖矩阵完整性可验证 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-matrix-coverage.test.ts`
  - 用例：`should assert matrix contains all mandatory boundary classes and scenario bindings`
- [ ] DM-P2-MAT-S2 `错误码与恢复策略一致性可验证 [ADDED]`
  - 目标测试：`apps/desktop/tests/integration/document-management/hardening-matrix-coverage.test.ts`
  - 用例：`should assert every matrix row has deterministic code and fallback strategy`

## 3. Red（先写失败测试）

- [ ] 3.1 定义 Red 门禁：DM-P2-HG-S1..S4 先失败后实现。
- [ ] 3.2 定义 Red 门禁：DM-P2-GATE-S1..S3 先失败后实现，且需输出阈值断言失败证据。
- [ ] 3.3 定义 Red 门禁：DM-P2-MAT-S1..S2 先失败后实现，避免矩阵空洞。
- [ ] 3.4 明确本 change 为 OpenSpec-only，Red 实际执行留待后续实现 Issue。

## 4. Green（最小实现通过）

- [ ] 4.1 约束最小实现范围：仅补足容量/编码/并发/路径守卫到通过 Red。
- [ ] 4.2 约束最小实现范围：仅补足性能阈值与队列背压可观测实现，不扩展额外功能。
- [ ] 4.3 约束最小实现范围：错误路径必须返回 `{ ok: false, code, message }`。
- [ ] 4.4 明确本 change 不执行 Green 编码，仅交付实现门禁输入。

## 5. Refactor（保持绿灯）

- [ ] 5.1 定义 Refactor 约束：不改变 IPC 对外契约与既有文档行为语义。
- [ ] 5.2 定义 Refactor 目标：统一错误码映射与冲突/背压处理路径，避免语义漂移。
- [ ] 5.3 定义 Refactor 验证：回归覆盖必须保持全部 Scenario 绿灯。

## 6. Evidence

- [ ] 6.1 已记录本次 OpenSpec 拆分产物（proposal/tasks/delta spec）。
- [ ] 6.2 已执行证据命令：`git diff --name-only`、`rg -n "^## " .../tasks.md`、`rg -n "^### Requirement:|Scenario:" .../spec.md`。
- [ ] 6.3 已检查活跃 change 数量并更新 `openspec/changes/EXECUTION_ORDER.md`，声明依赖关系。
